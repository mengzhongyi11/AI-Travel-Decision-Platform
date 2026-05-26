/// <reference types="@amap/amap-jsapi-types" />
declare global {
  interface Window {
    AMap: typeof AMap
  }
}
