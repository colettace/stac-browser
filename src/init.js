import Vue from "vue";
import StacBrowser from "./StacBrowser.vue";
import i18n, { loadDefaultMessages } from './i18n';



// Enable Vue Devtools
Vue.config.devtools = true;

export default function init() {
  return loadDefaultMessages().then(() => {
    return new Vue({
      i18n,
      render: h => h(StacBrowser)
    }).$mount("#stac-browser");
  });
}
