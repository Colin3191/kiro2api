const CLAUDE_MULTIPLIERS = {
  word: 1.13,
  number: 1.63,
  cjk: 1.21,
  symbol: 0.4,
  mathSymbol: 4.52,
  urlDelim: 1.26,
  atSign: 2.82,
  emoji: 2.6,
  newline: 0.89,
  space: 0.39,
};

function isCJK(code) {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df) ||
    (code >= 0x2a700 && code <= 0x2b73f) ||
    (code >= 0x2b740 && code <= 0x2b81f) ||
    (code >= 0x3040 && code <= 0x30ff) ||
    (code >= 0xac00 && code <= 0xd7a3)
  );
}

function isEmoji(code) {
  return (
    (code >= 0x1f300 && code <= 0x1f9ff) ||
    (code >= 0x2600 && code <= 0x26ff) ||
    (code >= 0x2700 && code <= 0x27bf) ||
    (code >= 0x1f600 && code <= 0x1f64f) ||
    (code >= 0x1f900 && code <= 0x1f9ff) ||
    (code >= 0x1fa00 && code <= 0x1faff)
  );
}

function isMathSymbol(code) {
  if (code >= 0x2200 && code <= 0x22ff) return true;
  if (code >= 0x2a00 && code <= 0x2aff) return true;
  if (code >= 0x1d400 && code <= 0x1d7ff) return true;
  const mathChars =
    '∑∫∂√∞≤≥≠≈±×÷∈∉∋∌⊂⊃⊆⊇∪∩∧∨¬∀∃∄∅∆∇∝∟∠∡∢°′″‴⁺⁻⁼⁽⁾ⁿ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎²³¹⁴⁵⁶⁷⁸⁹⁰';
  return mathChars.includes(String.fromCodePoint(code));
}

function isURLDelim(code) {
  return '/:?&=;#%'.includes(String.fromCodePoint(code));
}

function isLetterOrDigit(code) {
  return (
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a) ||
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0xc0 && code <= 0x24f)
  );
}

function isDigit(code) {
  return code >= 0x30 && code <= 0x39;
}

const NONE = 0;
const LATIN = 1;
const NUMBER = 2;

function countText(text) {
  if (!text) return 0;

  const m = CLAUDE_MULTIPLIERS;
  let count = 0;
  let currentWordType = NONE;

  for (const char of text) {
    const code = char.codePointAt(0);

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      currentWordType = NONE;
      if (char === '\n' || char === '\t') {
        count += m.newline;
      } else {
        count += m.space;
      }
      continue;
    }

    if (isCJK(code)) {
      currentWordType = NONE;
      count += m.cjk;
      continue;
    }

    if (isEmoji(code)) {
      currentWordType = NONE;
      count += m.emoji;
      continue;
    }

    if (isLetterOrDigit(code)) {
      const isNum = isDigit(code);
      const newType = isNum ? NUMBER : LATIN;

      if (currentWordType === NONE || currentWordType !== newType) {
        count += isNum ? m.number : m.word;
        currentWordType = newType;
      }
      continue;
    }

    currentWordType = NONE;
    if (isMathSymbol(code)) {
      count += m.mathSymbol;
    } else if (code === 0x40) {
      count += m.atSign;
    } else if (isURLDelim(code)) {
      count += m.urlDelim;
    } else {
      count += m.symbol;
    }
  }

  return Math.ceil(count);
}

export function countMessages(messages, system) {
  let tokens = 0;
  if (system)
    tokens += countText(typeof system === 'string' ? system : JSON.stringify(system));
  for (const msg of messages || []) {
    tokens += 4;
    if (typeof msg.content === 'string') {
      tokens += countText(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'text') tokens += countText(block.text);
        else if (block.type === 'tool_result')
          tokens += countText(
            typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
          );
        else if (block.type === 'tool_use') tokens += countText(JSON.stringify(block.input));
      }
    }
  }
  return tokens;
}

export function countContent(content) {
  if (typeof content === 'string') return countText(content);
  let tokens = 0;
  for (const block of content || []) {
    if (block.type === 'text') tokens += countText(block.text);
    else if (block.type === 'tool_use') tokens += countText(JSON.stringify(block.input));
    else if (block.type === 'thinking') tokens += countText(block.thinking);
  }
  return tokens;
}
