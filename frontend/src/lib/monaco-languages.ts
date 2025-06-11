// Monaco Editor Language Definitions for LaTeX and BibTeX

export const latexLanguageConfig = {
  displayName: "Latex",
  name: "latex",
  mimeTypes: ["text/latex", "text/tex"],
  fileExtensions: ["tex", "sty", "cls"],
  
  lineComment: "% ",
  
  builtin: [
    "addcontentsline", "addtocontents", "addtocounter", "address", "addtolength", "addvspace", "alph", "appendix",
    "arabic", "author", "backslash", "baselineskip", "baselinestretch", "bf", "bibitem", "bigskipamount", "bigskip",
    "boldmath", "boldsymbol", "cal", "caption", "cdots", "centering", "chapter", "circle", "cite", "cleardoublepage",
    "clearpage", "cline", "closing", "color", "copyright", "dashbox", "date", "ddots", "documentclass", "dotfill", "em",
    "emph", "ensuremath", "epigraph", "euro", "fbox", "flushbottom", "fnsymbol", "footnote", "footnotemark",
    "footnotesize", "footnotetext", "frac", "frame", "framebox", "frenchspacing", "hfill", "hline", "href", "hrulefill",
    "hspace", "huge", "Huge", "hyphenation", "include", "includegraphics", "includeonly", "indent", "input", "it", "item",
    "kill", "label", "large", "Large", "LARGE", "LaTeX", "LaTeXe", "ldots", "left", "lefteqn", "line", "linebreak",
    "linethickness", "linewidth", "listoffigures", "listoftables", "location", "makebox", "maketitle", "markboth",
    "mathcal", "mathop", "mbox", "medskip", "multicolumn", "multiput", "newcommand", "newcolumntype", "newcounter",
    "newenvironment", "newfont", "newlength", "newline", "newpage", "newsavebox", "newtheorem", "nocite", "noindent",
    "nolinebreak", "nonfrenchspacing", "normalsize", "nopagebreak", "not", "onecolumn", "opening", "oval", "overbrace",
    "overline", "pagebreak", "pagenumbering", "pageref", "pagestyle", "par", "paragraph", "parbox", "parindent", "parskip",
    "part", "protect", "providecommand", "put", "raggedbottom", "raggedleft", "raggedright", "raisebox", "ref",
    "renewcommand", "right", "rm", "roman", "rule", "savebox", "sbox", "sc", "scriptsize", "section", "setcounter",
    "setlength", "settowidth", "sf", "shortstack", "signature", "sl", "slash", "small", "smallskip", "sout", "space", "sqrt",
    "stackrel", "stepcounter", "subparagraph", "subsection", "subsubsection", "tableofcontents", "telephone", "TeX",
    "textbf", "textcolor", "textit", "textmd", "textnormal", "textrm", "textsc", "textsf", "textsl", "texttt", "textup",
    "textwidth", "textheight", "thanks", "thispagestyle", "tiny", "title", "today", "tt", "twocolumn", "typeout", "typein",
    "uline", "underbrace", "underline", "unitlength", "usebox", "usecounter", "uwave", "value", "vbox", "vcenter", "vdots",
    "vector", "verb", "vfill", "vline", "vphantom", "vspace",
    
    "RequirePackage", "NeedsTeXFormat", "usepackage", "input", "include", "documentclass", "documentstyle",
    "def", "edef", "defcommand", "if", "ifdim", "ifnum", "ifx", "fi", "else", "begingroup", "endgroup",
    "definecolor", "textcolor", "color",
    "eifstrequal", "eeifstrequal"
  ],
  
  tokenizer: {
    root: [
      ["(\\\\begin)(\\s*)(\\{)([\\w\\-\\*\\@]+)(\\})", 
          ["keyword.predefined", "white", "@brackets", { "token": "tag.env-$4", "bracket": "@open" }, "@brackets"]],
      ["(\\\\end)(\\s*)(\\{)([\\w\\-\\*\\@]+)(\\})", 
          ["keyword.predefined", "white", "@brackets", { "token": "tag.env-$4", "bracket": "@close" }, "@brackets"]],          
      ["\\\\[^a-zA-Z@]", "keyword"],  
      ["\\@[a-zA-Z@]+", "keyword.at"],  
      ["\\\\([a-zA-Z@]+)", { "cases": {
        "$1@builtin": "keyword.predefined",
        "@default": "keyword" 
      }}],  
      { "include": "@whitespace" },
      ["[{}()\\[\\]]", "@brackets"],
      ["#+\\d", "number.arg"],
      ["\\-?(?:\\d+(?:\\.\\d+)?|\\.\\d+)\\s*(?:em|ex|pt|pc|sp|cm|mm|in)", "number.len"]
    ],

    whitespace: [
      ["[ \\t\\r\\n]+", "white"],
      ["%.*$", "comment"]
    ]
  }
};

export const bibtexLanguageConfig = {
  displayName: "BibTeX",
  name: "bibtex",
  mimeTypes: ["text/bibtex"],
  fileExtensions: ["bib"],
  ignoreCase: true,
  
  lineComment: "% ",
  
  entries: [
    "article", "book", "booklet", "conference", "inbook", "incollection", 
    "inproceedings", "manual", "mastersthesis", "misc", "phdthesis", "proceedings", 
    "techreport", "unpublished", "xdata",
    "preamble", "string", "comment"    
  ],

  fields: [
    "address", "annote", "author", "booktitle", "chapter", "crossref", 
    "edition", "editor", "howpublished", "institution", "journal", "key", 
    "month", "note", "number", "organization", "pages", "publisher", "school", 
    "series", "title", "type", "volume", "year", "url", "isbn", "issn", "lccn", 
    "abstract", "keywords", "price", "copyright", "language", "contents", 
    "numpages", "doi", "http", "eds", "editors", "location",
    "eprinttype", "etype", "eprint", "eprintpath", "primaryclass", "eprintclass", "archiveprefix",
    "origpublisher", "origlocation", "venue", "volumes", "pagetotal", 
    "annotation", "annote", "pubstate",
    "date", "urldate", "eventdate", "origdate", "urltext"
  ],

  tokenizer: {
    root: [
      ["\\\\[^a-z]", "string.escape"],
      
      ["(@)([a-z]+)(\\{)(\\s*[^\\s,=]+)?", ["keyword", { "cases": {
        "$2@entries": "keyword",
        "@default": ""
      }}, "@brackets", "type"]],
      
      ["\\b([a-z]+)(?=\\s*=)", { "cases": {
        "$1@fields": "constructor",
        "@default": ""
      }}],
      
      ["[=]", "keyword"],
      
      { "include": "@whitespace" },
      
      ["[{}()\\[\\]]", "@brackets"]      
    ],

    whitespace: [
      ["[ \\t\\r\\n]+", "white"],
      ["%.*$", "comment"]
    ]
  }
};

export function setupMonacoLanguages(monaco: any) {
  // Register LaTeX language
  monaco.languages.register({ id: 'latex' });
  monaco.languages.setMonarchTokensProvider('latex', latexLanguageConfig);
  monaco.languages.setLanguageConfiguration('latex', {
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    comments: {
      lineComment: '%'
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '$', close: '$' },
      { open: '"', close: '"' }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '$', close: '$' },
      { open: '"', close: '"' }
    ]
  });

  // Register BibTeX language
  monaco.languages.register({ id: 'bibtex' });
  monaco.languages.setMonarchTokensProvider('bibtex', bibtexLanguageConfig);
  monaco.languages.setLanguageConfiguration('bibtex', {
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    comments: {
      lineComment: '%'
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' }
    ]
  });

  // Add LaTeX completions
  monaco.languages.registerCompletionItemProvider('latex', {
    provideCompletionItems: (model: any, position: any) => {
      const suggestions = [
        {
          label: 'section',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'section{${1:title}}\n\\label{sec:${2:label}}\n\n${3:content}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Insert a new section'
        },
        {
          label: 'subsection',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'subsection{${1:title}}\n\\label{subsec:${2:label}}\n\n${3:content}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Insert a new subsection'
        },
        {
          label: 'begin',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'begin{${1:environment}}\n\t${2:content}\n\\end{${1:environment}}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Begin/end environment'
        },
        {
          label: 'itemize',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'begin{itemize}\n\t\\item ${1:first item}\n\t\\item ${2:second item}\n\\end{itemize}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Bulleted list'
        },
        {
          label: 'enumerate',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'begin{enumerate}\n\t\\item ${1:first item}\n\t\\item ${2:second item}\n\\end{enumerate}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Numbered list'
        },
        {
          label: 'textbf',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'textbf{${1:text}}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Bold text'
        },
        {
          label: 'textit',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'textit{${1:text}}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Italic text'
        },
        {
          label: 'emph',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'emph{${1:text}}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Emphasized text'
        },
        {
          label: 'equation',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'begin{equation}\n\t${1:equation}\n\\label{eq:${2:label}}\n\\end{equation}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Numbered equation'
        }
      ];
      return { suggestions };
    }
  });
}