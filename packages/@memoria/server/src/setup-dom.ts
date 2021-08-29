declare global {
  interface Window {
    MemserverModel: any;
    MemServer: any;
    FakeXMLHttpRequest: any;
    RouteRecognizer: any;
  }

  namespace NodeJS {
    interface Global {
      MemserverModel: any;
      MemServer: any;
      FakeXMLHttpRequest: any;
      RouteRecognizer: any;
      self: any;
      FormData: any;
    }
  }
}

import pkg from "jsdom";

export default async function () {
  const { JSDOM } = pkg;
  const dom = new JSDOM("<p>Hello</p>", {
    url: "http://localhost",
  });

  global.window = dom.window;
  global.document = window.document;
  global.FormData = dom.window.FormData;
  global.self = global; // NOTE: super important for pretender
  self.XMLHttpRequest = dom.window.XMLHttpRequest; // pretender reference
  global.location = global.window.location; // removes href of undefined on jquery
}
