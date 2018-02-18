# tabooular
Table Generator for LaTeX, HTML, etc.
```
$ cat > sample1.txt
;
; Basic Table
;
 ID   | Name           & Age & Job       ; <th align="center">ID</th>
=====>|<=============== ====>&=========  ; (`&` === `SP`) !== `|`
 A001 | Taro Sato      & 12  & Student   ; column separator is `|` or `&`
 A002 | Takashi Suzuki & 24  & Student   ; (`|` === `&`)
---------------------------------------  ; if ('---'.length > 3) drawLine();
 B001 | Taro Yamada    & 36  & null
$
$ tabooular -if plain -of latex -i sample1.txt --escape
\begin{tabular}{r|lrc}\toprule
\multicolumn{1}{c|}{ID}&\multicolumn{1}{c}{Name}&\multicolumn{1}{c}{Age}&\multicolumn{1}{c}{Job}\\
\midrule
A001&Taro Sato&12&Student\\
A002&Takashi Suzuki&24&Student\\
\midrule
B001&Taro Yamada&36&null\\
\bottomrule
\end{tabular}
```

## Install
```
$ npm install tabooular
```

## Demo
https://lrks.github.io/tabooular/

## 説明的なもの
* ぼくがかんがえたさいきょうの表マークアップ
* 表っぽいものを入れるとLaTeX/HTMLでマークアップされた表を吐き出す
* PEGJSでパースして整形してる
  * 「縦連結やエスケープに `\` を使うが、`\LaTeX` などはそのまま通す」こともあるようなないような
    * おすすめはしない
  * 「 `;` を1行コメントとして使うが、`printf();` などは通す」
  * といった継ぎ接ぎを行った結果、文法がめちゃめちゃになっている
  * Demoを見るといい

# 開発
```
$ git checkout develop
$ npm install --only=dev
$ :
$ ./bin/tabooular.js -if plain -of latex -i docs/samples/sample1.txt --escape
$ :
$ npm run prepublish
$ :
$ git push origin develop 
$ git checkout master
$ git merge develop
$ npm publish
```