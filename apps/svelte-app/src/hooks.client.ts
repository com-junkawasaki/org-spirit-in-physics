import { i18n } from "$lib/i18n";

export const reroute = (event: { url: URL }) => {
    return i18n.reroute()(event);
};
