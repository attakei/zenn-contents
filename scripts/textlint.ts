/**
 * textlint by Deno
 *
 */

import { createLinter, loadTextlintrc, loadLinterFormatter } from "textlint";
// プラグインのロード（ダウンロードさせるのが主目的なので、importのみで良い）
import "npm:textlint-rule-preset-ja-technical-writing";
import "npm:textlint-filter-rule-comments";

// ここから実行本体。
const descriptor = await loadTextlintrc();
const linter = createLinter({
    descriptor
});
const results = await linter.lintFiles(Deno.args);
if (results.find(r => r.messages.length != 0) === undefined) {
  Deno.exit(0);
}

const formatter = await loadLinterFormatter({ formatterName: "stylish" })
const output = formatter.format(results);
console.log(output);
Deno.exit(1);
