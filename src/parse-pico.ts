export function parseTexture(s: string): number[] {
  const indices = Array(128 * 120);

  let i = 0;
  let line;
  for (let y = 0; y < 120; y++) {
    [line, s] = readLine(s);

    for (let x = 0; x < 128; x++) {
      indices[i] = Number.parseInt(line.charAt(x), 16);
      i++;
    }
  }

  return indices;
}
export function splitString(s: string, sep: string): [string, string] {
  const i = s.indexOf(sep);
  return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + sep.length)];
}
export function readLine(s: string): [string, string] {
  let i = 0;
  let end = s.length;
  while (i < s.length) {
    const c = s.charAt(i);
    i++;
    if (c === "\n") {
      end = i - 1;
      break;
    } else if (c === "\r") {
      end = i - 1;
      if (s.charAt(i) === "\n") {
        i++;
      }
      break;
    }
  }

  return [s.slice(0, end), s.slice(i)];
}
