import { createI18n } from "@inlang/paraglide-sveltekit";
import * as runtime from "$lib/paraglide/runtime.js";

let instance: any;
function getI18n() {
    if (!instance) {
        instance = createI18n(runtime, {
            pathnames: {},
            prefixDefaultLanguage: "never", 
        });
    }
    return instance;
}

export const i18n: any = new Proxy({}, {
    get(_, prop) {
        const target = getI18n();
        const value = target[prop];
        if (typeof value === 'function') {
            return value.bind(target);
        }
        return value;
    }
});

