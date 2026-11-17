function serializeString(str: string): string {
  let out = "";
  let last = 0;
  for (let i = 0; i < str.length; i++) {
    let esc: string | undefined;
    switch (str.charCodeAt(i)) {
      case 34:
        esc = '\\"';
        break;
      case 92:
        esc = "\\\\";
        break;
      case 10:
        esc = "\\n";
        break;
      case 13:
        esc = "\\r";
        break;
      case 8:
        esc = "\\b";
        break;
      case 9:
        esc = "\\t";
        break;
      case 12:
        esc = "\\f";
        break;
      case 60:
        esc = "\\x3C";
        break;
      case 8232:
        esc = "\\u2028";
        break;
      case 8233:
        esc = "\\u2029";
        break;
    }
    if (esc) {
      out += str.slice(last, i) + esc;
      last = i + 1;
    }
  }
  return last === 0 ? str : out + str.slice(last);
}

function deserializeString(str: string): string {
  let idx = str.indexOf("\\");
  if (idx === -1) return str;

  let out = "";
  let last = 0;
  const max = str.length - 1;
  while (idx !== -1 && idx < max) {
    let ch: string | undefined;
    let step = 2;
    switch (str.charCodeAt(idx + 1)) {
      case 92:
        ch = "\\";
        break;
      case 34:
        ch = '"';
        break;
      case 110:
        ch = "\n";
        break;
      case 114:
        ch = "\r";
        break;
      case 98:
        ch = "\b";
        break;
      case 116:
        ch = "\t";
        break;
      case 102:
        ch = "\f";
        break;
      case 120:
        if (str.startsWith("3C", idx + 2)) {
          ch = "<";
          step = 4;
        }
        break;
      case 117:
        if (str.startsWith("2028", idx + 2)) {
          ch = "\u2028";
          step = 6;
        } else if (str.startsWith("2029", idx + 2)) {
          ch = "\u2029";
          step = 6;
        }
        break;
    }
    if (ch !== undefined) {
      out += str.slice(last, idx) + ch;
      last = idx + step;
      idx = str.indexOf("\\", last);
    } else {
      idx = str.indexOf("\\", idx + 1);
    }
  }
  return out + str.slice(last);
}

export function encodeSeroval(value: unknown): string {
  let nextId = 0;

  function serialize(val: unknown): unknown {
    if (val === null) return { t: 2, s: 0 };
    if (val === undefined) return { t: 2, s: 1 };
    if (vBool(val)) return { t: 2, s: val ? 2 : 3 };
    if (typeof val === "number") {
      if (Number.isNaN(val)) return { t: 2, s: 4 };
      if (val === Infinity) return { t: 2, s: 5 };
      if (val === -Infinity) return { t: 2, s: 6 };
      if (Object.is(val, -0)) return { t: 2, s: 7 };
      return { t: 0, s: val };
    }
    if (typeof val === "string") return { t: 1, s: serializeString(val) };
    if (val instanceof Date) {
      return { t: 5, i: nextId++, s: val.toISOString() };
    }
    if (Array.isArray(val)) {
      const id = nextId++;
      return { t: 9, i: id, a: val.map(serialize) };
    }
    if (typeof val === "object") {
      const id = nextId++;
      const keys: string[] = [];
      const values: unknown[] = [];
      for (const [key, entry] of Object.entries(val as Record<string, unknown>)) {
        if (entry === undefined) continue;
        keys.push(serializeString(key));
        values.push(serialize(entry));
      }
      return { t: 10, i: id, p: { k: keys, v: values } };
    }
    return { t: 2, s: 1 };
  }

  function vBool(v: unknown): v is boolean {
    return v === true || v === false;
  }

  return JSON.stringify({ t: serialize(value), f: 127, m: [] });
}

export function decodeSeroval(payload: unknown): any {
  const refs = new Map<number, any>();

  function deserialize(node: any): any {
    if (!node || typeof node !== "object") {
      return node;
    }

    switch (node.t) {
      case 0:
        return node.s;
      case 1:
        return typeof node.s === "string" ? deserializeString(node.s) : node.s;
      case 2:
        switch (node.s) {
          case 0:
            return null;
          case 1:
            return undefined;
          case 2:
            return true;
          case 3:
            return false;
          case 4:
            return NaN;
          case 5:
            return Infinity;
          case 6:
            return -Infinity;
          case 7:
            return -0;
          default:
            return undefined;
        }
      case 4:
        return refs.get(node.i);
      case 5: {
        const date = new Date(node.s);
        if (node.i !== undefined) refs.set(node.i, date);
        return date;
      }
      case 7: {
        const set = new Set<any>();
        if (node.i !== undefined) refs.set(node.i, set);
        for (const item of node.a || []) {
          set.add(deserialize(item));
        }
        return set;
      }
      case 8: {
        const map = new Map<any, any>();
        if (node.i !== undefined) refs.set(node.i, map);
        const ks = node.e?.k || [];
        const vs = node.e?.v || [];
        for (let idx = 0; idx < ks.length; idx++) {
          map.set(deserialize(ks[idx]), deserialize(vs[idx]));
        }
        return map;
      }
      case 9: {
        const arr: any[] = [];
        if (node.i !== undefined) refs.set(node.i, arr);
        for (const item of node.a || []) {
          arr.push(deserialize(item));
        }
        return arr;
      }
      case 10:
      case 11: {
        const obj: Record<string, any> = {};
        if (node.i !== undefined) refs.set(node.i, obj);
        const ks: string[] = node.p?.k || [];
        const vs: any[] = node.p?.v || [];
        for (let idx = 0; idx < ks.length; idx++) {
          const key = typeof ks[idx] === "string" ? deserializeString(ks[idx]) : ks[idx];
          obj[key] = deserialize(vs[idx]);
        }
        return obj;
      }
      default:
        return undefined;
    }
  }

  const root =
    payload &&
    typeof payload === "object" &&
    typeof (payload as any).t === "object" &&
    (payload as any).t !== null
      ? (payload as any).t
      : payload;

  return deserialize(root);
}
