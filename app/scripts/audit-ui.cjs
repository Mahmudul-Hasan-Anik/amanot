// Counts source declarations, not the number of rows produced by runtime maps.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.tsx') ? [path.join(dir, e.name)] : []);
}
const routes = files(path.join(root, 'app'));
const components = files(path.join(root, 'src/components'));
const names = ['TouchableOpacity', 'Pressable', 'Button', 'FAB', 'Card', 'FilterChip', 'StatusChip', 'SearchBar', 'Input', 'TextInput', 'AppModal'];
const totals = Object.fromEntries(names.map(n => [n, 0]));
let inlineCardContainers = 0;
for (const file of routes) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(source);
      if (name in totals) totals[name]++;
      if (['View', 'TouchableOpacity', 'Pressable'].includes(name)) {
        const style = node.attributes.properties.find(p => p.name?.getText(source) === 'style');
        if (style && /styles\.[a-zA-Z]*[Cc]ard\b/.test(style.getText(source))) inlineCardContainers++;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
console.log(JSON.stringify({ routeFilesIncludingLayouts: routes.length, sharedComponentFiles: components.length, declarations: totals, inlineCardContainersByStyleName: inlineCardContainers }, null, 2));
