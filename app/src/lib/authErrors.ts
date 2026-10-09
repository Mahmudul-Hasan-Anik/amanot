export function friendlyAuthError(message: string): string {
  if (/invalid login|invalid credentials/i.test(message)) return 'পিন সঠিক নয়।';
  if (/validate email|invalid.*email|email.*invalid/i.test(message)) return 'মোবাইল নম্বর দিয়ে আবার লগইন শুরু করুন।';
  if (/rate.limit|too many|over_request/i.test(message)) return 'বেশি চেষ্টা হয়েছে। ৫ মিনিট পরে আবার চেষ্টা করুন।';
  if (/network|fetch|connection/i.test(message)) return 'ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।';
  if (/already registered|already.*exists/i.test(message)) return 'এই নম্বরের অ্যাকাউন্ট চালু আছে। নম্বর দিয়ে আবার লগইন শুরু করুন।';
  if (/database error/i.test(message)) return 'পিন ভুল অথবা অ্যাকাউন্ট চালু করা যায়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।';
  if (/password.*(short|least|characters|weak)/i.test(message)) return 'অ্যাডমিনের দেওয়া নতুন ৬ সংখ্যার পিন ব্যবহার করুন।';
  if (/email.*confirm/i.test(message)) return 'অ্যাকাউন্ট চালু করা যায়নি। সমিতির অ্যাডমিনের সাথে যোগাযোগ করুন।';
  return /[\u0980-\u09ff]/.test(message) ? message : 'লগইন সম্পন্ন হয়নি। আবার চেষ্টা করুন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।';
}
