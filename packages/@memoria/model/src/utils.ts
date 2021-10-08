export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;

    return v.toString(16);
  });
}

interface AnyObject {
  [key: string]: any;
}

export function clearObject(object: AnyObject) {
  Object.keys(object).forEach((keyName) => {
    delete object[keyName];
  });

  return object;
}
// typeorm uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(msg) false ise yeniden yap
