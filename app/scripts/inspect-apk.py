"""Read-only APK v2 integrity/certificate and binary-manifest inspection.

Uses Python cryptography. Not an Android install/runtime test or a replacement
for the Android package manager's platform-specific compatibility checks.
Format: https://source.android.com/docs/security/features/apksigning/v2
"""
import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, ec, dsa, padding


def require(condition, message):
    if not condition:
        raise ValueError(message)


def uint(data, offset, size=4):
    require(0 <= offset <= len(data) - size, "Truncated APK structure")
    return int.from_bytes(data[offset:offset+size], "little")


def lp(data, offset=0):
    length = uint(data, offset)
    end = offset + 4 + length
    require(end <= len(data), "Truncated length-prefixed field")
    return data[offset+4:end], end


def sequence(data):
    offset = 0
    while offset < len(data):
        value, offset = lp(data, offset)
        yield value


def verify_v2(data):
    eocd = data.rfind(b"PK\x05\x06", max(0, len(data)-65557))
    require(eocd >= 0 and eocd+22+uint(data, eocd+20, 2) == len(data), "Invalid ZIP end record")
    central = uint(data, eocd+16)
    require(central+uint(data, eocd+12) == eocd, "Invalid central directory extent")
    require(data[central-16:central] == b"APK Sig Block 42", "Missing APK signing block")
    size = uint(data, central-24, 8)
    start = central-size-8
    require(start >= 0 and uint(data, start, 8) == size, "Signing block sizes differ")
    pos, blocks = start+8, []
    while pos < central-24:
        length = uint(data, pos, 8)
        require(length >= 4 and pos+8+length <= central-24, "Invalid signing block pair")
        if uint(data, pos+8) == 0x7109871A:
            blocks.append(data[pos+12:pos+8+length])
        pos += 8+length
    require(pos == central-24 and len(blocks) == 1, "Expected one APK v2 signing block")
    signers, end = lp(blocks[0])
    require(end == len(blocks[0]), "Unexpected APK v2 trailing data")
    corrected_end = bytearray(data[eocd:])
    struct.pack_into("<I", corrected_end, 16, start)
    sections = (data[:start], data[central:eocd], corrected_end)
    fingerprints = []
    algorithms = []
    for signer in sequence(signers):
        signed, p = lp(signer)
        signatures, p = lp(signer, p)
        public_der, p = lp(signer, p)
        require(p == len(signer), "Unexpected signer trailing data")
        digests, p = lp(signed)
        certificates, p = lp(signed, p)
        _, p = lp(signed, p)
        # Some signers append a zero-length reserved field. The signature below
        # covers the entire signed buffer, including these trailing zero bytes.
        require(not any(signed[p:]), "Unexpected signed-data trailing data")
        def records(values):
            result = []
            for record in sequence(values):
                algorithm = uint(record, 0)
                value, end = lp(record, 4)
                require(end == len(record), "Unexpected signature/digest record")
                result.append((algorithm, value))
            return result
        sigs, digs = records(signatures), records(digests)
        require([a for a, _ in sigs] == [a for a, _ in digs], "Signature/digest algorithms differ")
        supported = [a for a, _ in sigs if a in (0x101, 0x102, 0x103, 0x104, 0x201, 0x202, 0x301)]
        require(bool(supported), "Unsupported APK v2 signature algorithm")
        algorithm = max(supported, key=lambda a: a in (0x102, 0x104, 0x202))
        digest_name = "sha512" if algorithm in (0x102, 0x104, 0x202) else "sha256"
        hash_type = hashes.SHA512() if digest_name == "sha512" else hashes.SHA256()
        key = serialization.load_der_public_key(public_der)
        signature = dict(sigs)[algorithm]
        if algorithm in (0x101, 0x102, 0x103, 0x104):
            require(isinstance(key, rsa.RSAPublicKey), "RSA signature key mismatch")
            scheme = padding.PSS(mgf=padding.MGF1(hash_type), salt_length=hash_type.digest_size) if algorithm in (0x101, 0x102) else padding.PKCS1v15()
            key.verify(signature, signed, scheme, hash_type)
        elif algorithm in (0x201, 0x202):
            require(isinstance(key, ec.EllipticCurvePublicKey), "EC signature key mismatch")
            key.verify(signature, signed, ec.ECDSA(hash_type))
        else:
            require(isinstance(key, dsa.DSAPublicKey), "DSA signature key mismatch")
            key.verify(signature, signed, hash_type)
        chunk_digests = []
        for section in sections:
            for offset in range(0, len(section), 1048576):
                chunk = section[offset:offset+1048576]
                chunk_digests.append(hashlib.new(digest_name, b"\xa5"+struct.pack("<I", len(chunk))+chunk).digest())
        content_digest = hashlib.new(digest_name, b"\x5a"+struct.pack("<I", len(chunk_digests))+b"".join(chunk_digests)).digest()
        require(content_digest == dict(digs)[algorithm], "APK content digest mismatch")
        certs = list(sequence(certificates))
        require(bool(certs), "Missing signing certificate")
        cert = x509.load_der_x509_certificate(certs[0])
        require(cert.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo) == public_der, "Certificate/public key mismatch")
        fingerprints.append(cert.fingerprint(hashes.SHA256()).hex())
        algorithms.append(hex(algorithm))
    require(bool(fingerprints), "No APK signers")
    return {"v2SignatureAndContentVerified": True, "certificateSha256": fingerprints, "signatureAlgorithms": algorithms}


def manifest_info(data):
    strings, result, offset = [], {}, uint(data, 2, 2)
    while offset < len(data):
        kind, header, size = uint(data, offset, 2), uint(data, offset+2, 2), uint(data, offset+4)
        require(size >= header >= 8 and offset+size <= len(data), "Invalid manifest chunk")
        if kind == 1:
            count, flags, start = uint(data, offset+8), uint(data, offset+16), uint(data, offset+20)
            for index in range(count):
                pos = offset+start+uint(data, offset+header+index*4)
                def length(at, unit):
                    n = uint(data, at, unit)
                    high = 0x80 if unit == 1 else 0x8000
                    if n & high:
                        return ((n & (high-1)) << (unit*8)) | uint(data, at+unit, unit), at+2*unit
                    return n, at+unit
                if flags & 0x100:
                    _, pos = length(pos, 1)
                    n, pos = length(pos, 1)
                    strings.append(data[pos:pos+n].decode("utf-8"))
                else:
                    n, pos = length(pos, 2)
                    strings.append(data[pos:pos+2*n].decode("utf-16le"))
        elif kind == 0x102 and strings[uint(data, offset+20)] == "manifest":
            attrs = offset+16+uint(data, offset+24, 2)
            stride, count = uint(data, offset+26, 2), uint(data, offset+28, 2)
            for index in range(count):
                pos = attrs+index*stride
                name = strings[uint(data, pos+4)]
                if name in ("package", "versionName", "versionCode"):
                    raw, value_type, value = uint(data, pos+8), data[pos+15], uint(data, pos+16)
                    result[name] = strings[raw] if raw != 0xFFFFFFFF else strings[value] if value_type == 3 else value
        offset += size
    return result


def inspect(apk):
    raw = Path(apk).read_bytes()
    result = {"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), **verify_v2(raw)}
    with zipfile.ZipFile(apk) as archive:
        require(archive.testzip() is None, "APK ZIP integrity failure")
        require("assets/index.android.bundle" in archive.namelist(), "Missing app bundle")
        result.update(manifest_info(archive.read("AndroidManifest.xml")))
        result["nativeArchitectures"] = sorted({n.split("/")[1] for n in archive.namelist() if n.startswith("lib/") and n.endswith(".so")})
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("apk")
    parser.add_argument("--compare")
    args = parser.parse_args()
    report = inspect(args.apk)
    if args.compare:
        previous = inspect(args.compare)
        require(report["package"] == previous["package"], "Previous APK package differs")
        require(report["certificateSha256"] == previous["certificateSha256"], "Previous APK signer differs")
        require(report["versionCode"] > previous["versionCode"], "Version code did not increase")
        report["previousSigningCertificateMatches"] = True
    print(json.dumps(report, indent=2))
