type LuaValue = string | number | LuaTable;
interface LuaTable {
  array: LuaValue[];
  dict: Record<string, LuaValue>;
}
interface LuaArray<T> {
  array: T[];
  dict: Record<string, LuaValue>;
}
interface LuaDict<T> {
  array: LuaValue[];
  dict: T;
}
interface LuaArrayDict<T, U> {
  array: T[];
  dict: U;
}
export interface LuaPicoCADModel {
  array: LuaDict<{
    name: string;
    pos: LuaArray<number>;
    rot: LuaArray<number>;
    v: LuaArray<LuaArray<number>>;
    f: LuaArray<
      LuaArrayDict<
        number,
        {
          c: number;
          dbl?: number;
          noshade?: number;
          notex?: number;
          prio?: number;
          uv: LuaArray<number>;
        }
      >
    >;
  }>[];
}

export function parsePicoCADData(s: string): LuaPicoCADModel {
  return parseLua(s) as any;
}

function parseLua(s: string): LuaTable {
  let i = 0;

  function readValue(): LuaValue {
    const c = s.charAt(i);
    if (c === "{") {
      return readObject();
    } else if (c === "'") {
      return readString();
    } else if (c === "-" || c === "." || (c >= "0" && c <= "9")) {
      return readNumber();
    } else {
      throw new Error(`Unknown value (${i}): "${c}" = ${c.charCodeAt(0)}`);
    }
  }

  function readObject(): LuaTable {
    i++; // {

    const obj: LuaTable = {
      array: [],
      dict: Object.create(null),
    };

    skipWhitespace();

    while (true) {
      const c = s.charAt(i);

      if (c === "}") {
        i++;
        break;
      }

      let key: string | undefined;

      if (c >= "a" && c <= "z") {
        // key-value pair
        let start = i;
        i++;

        while (true) {
          const c = s.charAt(i);
          if (c === "=") {
            break;
          } else {
            i++;
          }
        }

        key = s.slice(start, i);
        i++; // =
      }

      const value = readValue();

      if (key == null) {
        obj.array.push(value);
      } else {
        obj.dict[key] = value;
      }

      skipWhitespace();

      const cc = s.charAt(i);

      if (cc === ",") {
        i++;
        skipWhitespace();
      }
    }

    return obj;
  }

  function readString(): string {
    // assuming no escapes
    const start = i;
    const j = s.indexOf("'", i + 1);
    if (j < 0) {
      throw new Error("No end!!!");
    }
    i = j + 1;
    return s.slice(start + 1, j);
  }

  function readNumber(): number {
    const start = i;

    while (true) {
      const c = s.charAt(i);

      if (c === "-" || c === "." || (c >= "0" && c <= "9")) {
        i++;
      } else {
        break;
      }
    }
    if (i === start) {
      throw new Error("!!!!");
    }

    return Number(s.slice(start, i));
  }

  function skipWhitespace() {
    while (true) {
      const c = s.charAt(i);

      if (c === " " || c === "\n" || c === "\r" || c === "\t") {
        i++;
      } else {
        break;
      }
    }
  }

  return readObject();
}
