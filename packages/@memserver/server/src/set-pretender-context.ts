import FakeXMLHttpRequest from "fake-xml-http-request";
import RouteRecognizer from "route-recognizer";

declare global {
  interface Window {
    FakeXMLHttpRequest: any;
    RouteRecognizer: any;
  }
}

self.FakeXMLHttpRequest = FakeXMLHttpRequest;
self.RouteRecognizer = RouteRecognizer;
