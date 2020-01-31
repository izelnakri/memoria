declare global {
  interface Window {
    $?: any;
  }

  namespace NodeJS {
    interface Global {
      window?: any;
      document?: any;
      self: any;
      $?: any;
    }
  }
}

export default async function() {
  const { JSDOM } = (await import("jsdom")).default;

  const dom = new JSDOM("<p>Hello</p>", { url: "http://localhost" });

  global.window = dom.window;
  global.document = window.document;
  global.self = window.self;
}
