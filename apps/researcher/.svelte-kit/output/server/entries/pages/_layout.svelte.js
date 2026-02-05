import { a as attr_style, b as attr_class, c as clsx, s as spread_props, d as attr } from "../../chunks/index.js";
import { g as ssr_context, h as getContext, s as setContext, i as escape_html } from "../../chunks/context.js";
import { p as page, g as goto } from "../../chunks/index3.js";
import { p as public_env } from "../../chunks/shared-server.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import { r as runtimeConfig } from "../../chunks/env.svelte.js";
import { o as overview, p as participants_list, s as sessions_history, a as settings, u as update, b as auth_required_title, c as auth_required_desc, d as signin, e as admin } from "../../chunks/messages.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
const _contextKey = "$$_clerk";
const useClerkContext = () => {
  const client = getContext(_contextKey);
  if (!client) {
    throw new Error("No Clerk data was found in Svelte context. Did you forget to wrap your component with ClerkProvider?");
  }
  return client;
};
const setClerkContext = (context) => {
  setContext(_contextKey, context);
};
function ClerkLoaded($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children } = $$props;
    const ctx = useClerkContext();
    if (ctx.isLoaded) {
      $$renderer2.push("<!--[-->");
      children($$renderer2, ctx.clerk);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function UserButton$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children: customMenuItems, $$slots, $$events, ...props } = $$props;
    let updatedProps = props;
    useClerkContext();
    setContext("$$_userButton", {
      addCustomMenuItem(_, item) {
        updatedProps.customMenuItems = [...updatedProps.customMenuItems || [], item];
      },
      addCustomPage(page2) {
        updatedProps.userProfileProps = {
          ...updatedProps.userProfileProps,
          customPages: [...updatedProps.userProfileProps?.customPages || [], page2]
        };
      }
    });
    onDestroy(() => {
    });
    ClerkLoaded($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    customMenuItems?.($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
function UserButtonAction($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { addCustomMenuItem } = getContext("$$_userButtonMenuItems");
    const { $$slots, $$events, ...props } = $$props;
  });
}
function UserButtonLink($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { addCustomMenuItem } = getContext("$$_userButtonMenuItems");
    const { label, href, labelIcon } = $$props;
  });
}
function UserButtonMenuItems($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const context = getContext("$$_userButton");
    const { children } = $$props;
    setContext("$$_userButtonMenuItems", context);
    children($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
function UserButtonUserProfilePage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { addCustomPage } = getContext("$$_userButton");
    const { children, labelIcon, label, url } = $$props;
  });
}
const UserButton = Object.assign(UserButton$1, {
  MenuItems: UserButtonMenuItems,
  Action: UserButtonAction,
  Link: UserButtonLink,
  UserProfilePage: UserButtonUserProfilePage
});
function SignedIn($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children } = $$props;
    const ctx = useClerkContext();
    if (ctx.auth.userId) {
      $$renderer2.push("<!--[-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function SignedOut($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children } = $$props;
    const ctx = useClerkContext();
    if (ctx.auth.userId === null) {
      $$renderer2.push("<!--[-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function SignInButton($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const {
      mode,
      children,
      style,
      class: buttonClass,
      asChild,
      $$slots,
      $$events,
      ...props
    } = $$props;
    const ctx = useClerkContext();
    function signIn() {
      if (!ctx.clerk) return;
      if (mode === "modal") {
        void ctx.clerk.openSignIn(props);
        return;
      }
      void ctx.clerk.redirectToSignIn({
        ...props,
        signInFallbackRedirectUrl: props.fallbackRedirectUrl,
        signInForceRedirectUrl: props.forceRedirectUrl
      });
    }
    if (asChild) {
      $$renderer2.push("<!--[-->");
      children?.($$renderer2, { signIn });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<button type="button"${attr_style(style)}${attr_class(clsx(buttonClass))}>`);
      if (children) {
        $$renderer2.push("<!--[-->");
        children($$renderer2, { signIn });
        $$renderer2.push(`<!---->`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`Sign in`);
      }
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
const deriveState = (clerkOperational, state, initialState) => {
  if (initialState) return deriveFromSsrInitialState(initialState);
  return deriveFromClientSideState(state);
};
const deriveFromSsrInitialState = (initialState) => {
  const userId = initialState.userId;
  const user = initialState.user;
  const sessionId = initialState.sessionId;
  const sessionStatus = initialState.sessionStatus;
  const sessionClaims = initialState.sessionClaims;
  return {
    userId,
    user,
    sessionId,
    session: initialState.session,
    sessionStatus,
    sessionClaims,
    organization: initialState.organization,
    orgId: initialState.orgId,
    orgRole: initialState.orgRole,
    orgPermissions: initialState.orgPermissions,
    orgSlug: initialState.orgSlug,
    actor: initialState.actor,
    factorVerificationAge: initialState.factorVerificationAge
  };
};
const deriveFromClientSideState = (state) => {
  const userId = state.user ? state.user.id : state.user;
  const user = state.user;
  const sessionId = state.session ? state.session.id : state.session;
  const session = state.session;
  const sessionStatus = state.session?.status;
  const sessionClaims = state.session ? state.session.lastActiveToken?.jwt?.claims : null;
  const factorVerificationAge = state.session ? state.session.factorVerificationAge : null;
  const actor = session?.actor;
  const organization = state.organization;
  const orgId = state.organization ? state.organization.id : state.organization;
  const orgSlug = organization?.slug;
  const membership = organization ? user?.organizationMemberships?.find((om) => om.organization.id === orgId) : organization;
  const orgPermissions = membership ? membership.permissions : membership;
  return {
    userId,
    user,
    sessionId,
    session,
    sessionStatus,
    sessionClaims,
    organization,
    orgId,
    orgRole: membership ? membership.role : membership,
    orgSlug,
    orgPermissions,
    actor,
    factorVerificationAge
  };
};
const DefaultMessages = Object.freeze({
  InvalidProxyUrlErrorMessage: `The proxyUrl passed to Clerk is invalid. The expected value for proxyUrl is an absolute URL or a relative path with a leading '/'. (key={{url}})`,
  InvalidPublishableKeyErrorMessage: `The publishableKey passed to Clerk is invalid. You can get your Publishable key at https://dashboard.clerk.com/last-active?path=api-keys. (key={{key}})`,
  MissingPublishableKeyErrorMessage: `Missing publishableKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
  MissingSecretKeyErrorMessage: `Missing secretKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
  MissingClerkProvider: `{{source}} can only be used within the <ClerkProvider /> component. Learn more: https://clerk.com/docs/components/clerk-provider`
});
function buildErrorThrower({ packageName, customMessages }) {
  let pkg = packageName;
  function buildMessage(rawMessage, replacements) {
    if (!replacements) return `${pkg}: ${rawMessage}`;
    let msg = rawMessage;
    const matches = rawMessage.matchAll(/{{([a-zA-Z0-9-_]+)}}/g);
    for (const match of matches) {
      const replacement = (replacements[match[1]] || "").toString();
      msg = msg.replace(`{{${match[1]}}}`, replacement);
    }
    return `${pkg}: ${msg}`;
  }
  const messages = {
    ...DefaultMessages,
    ...customMessages
  };
  return {
    setPackageName({ packageName: packageName$1 }) {
      if (typeof packageName$1 === "string") pkg = packageName$1;
      return this;
    },
    setMessages({ customMessages: customMessages$1 }) {
      Object.assign(messages, customMessages$1 || {});
      return this;
    },
    throwInvalidPublishableKeyError(params) {
      throw new Error(buildMessage(messages.InvalidPublishableKeyErrorMessage, params));
    },
    throwInvalidProxyUrl(params) {
      throw new Error(buildMessage(messages.InvalidProxyUrlErrorMessage, params));
    },
    throwMissingPublishableKeyError() {
      throw new Error(buildMessage(messages.MissingPublishableKeyErrorMessage));
    },
    throwMissingSecretKeyError() {
      throw new Error(buildMessage(messages.MissingSecretKeyErrorMessage));
    },
    throwMissingClerkProviderError(params) {
      throw new Error(buildMessage(messages.MissingClerkProvider, params));
    },
    throw(message) {
      throw new Error(buildMessage(message));
    }
  };
}
const errorThrower = buildErrorThrower({ packageName: "@clerk/shared" });
function setClerkJsLoadingErrorPackageName(packageName) {
  errorThrower.setPackageName({ packageName });
}
buildErrorThrower({ packageName: "svelte-clerk" });
function ClerkProvider($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children, initialState, $$slots, $$events, ...props } = $$props;
    let clerk = null;
    let isLoaded = false;
    let resources = {
      client: void 0,
      session: void 0,
      user: void 0,
      organization: void 0
    };
    const auth = deriveState(isLoaded, resources, initialState);
    const client = resources.client;
    const session = auth.session;
    const user = auth.user;
    const organization = auth.organization;
    setClerkJsLoadingErrorPackageName("svelte-clerk");
    setClerkContext({
      get clerk() {
        return clerk;
      },
      get isLoaded() {
        return isLoaded;
      },
      get auth() {
        return auth;
      },
      get client() {
        return client;
      },
      get session() {
        return session;
      },
      get user() {
        return user;
      },
      get organization() {
        return organization;
      }
    });
    children($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
function isTruthy(value) {
  if (typeof value === `boolean`) return value;
  if (value === void 0 || value === null) return false;
  if (typeof value === `string`) {
    if (value.toLowerCase() === `true`) return true;
    if (value.toLowerCase() === `false`) return false;
  }
  const number = parseInt(value, 10);
  if (isNaN(number)) return false;
  if (number > 0) return true;
  return false;
}
function getEnvVariable(name, defaultValue) {
  return name in public_env ? public_env[name] : defaultValue;
}
function getDynamicPublicEnvVariables() {
  return {
    publishableKey: getEnvVariable("PUBLIC_CLERK_PUBLISHABLE_KEY"),
    domain: getEnvVariable("PUBLIC_CLERK_DOMAIN"),
    isSatellite: getEnvVariable("PUBLIC_CLERK_IS_SATELLITE"),
    proxyUrl: getEnvVariable("PUBLIC_CLERK_PROXY_URL"),
    signInUrl: getEnvVariable("PUBLIC_CLERK_SIGN_IN_URL"),
    signUpUrl: getEnvVariable("PUBLIC_CLERK_SIGN_UP_URL"),
    clerkJSUrl: getEnvVariable("PUBLIC_CLERK_JS_URL"),
    clerkJSVersion: getEnvVariable("PUBLIC_CLERK_JS_VERSION"),
    signInForceRedirectUrl: getEnvVariable("PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL"),
    signUpForceRedirectUrl: getEnvVariable("PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL"),
    signInFallbackRedirectUrl: getEnvVariable("PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL"),
    signUpFallbackRedirectUrl: getEnvVariable("PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL"),
    telemetryDisabled: isTruthy(getEnvVariable("PUBLIC_CLERK_TELEMETRY_DISABLED")),
    telemetryDebug: isTruthy(getEnvVariable("PUBLIC_CLERK_TELEMETRY_DEBUG"))
  };
}
function mergeWithPublicEnvVariables(clerkInitOptions) {
  const { publishableKey, signInUrl, signUpUrl, signInForceRedirectUrl, signUpForceRedirectUrl, signInFallbackRedirectUrl, signUpFallbackRedirectUrl, clerkJSUrl, clerkJSVersion, proxyUrl, domain, telemetry } = clerkInitOptions;
  return {
    publishableKey: publishableKey || getDynamicPublicEnvVariables().publishableKey,
    signInUrl: signInUrl || getDynamicPublicEnvVariables().signInUrl,
    signUpUrl: signUpUrl || getDynamicPublicEnvVariables().signUpUrl,
    signInForceRedirectUrl: signInForceRedirectUrl || getDynamicPublicEnvVariables().signInForceRedirectUrl,
    signUpForceRedirectUrl: signUpForceRedirectUrl || getDynamicPublicEnvVariables().signUpForceRedirectUrl,
    signInFallbackRedirectUrl: signInFallbackRedirectUrl || getDynamicPublicEnvVariables().signInFallbackRedirectUrl,
    signUpFallbackRedirectUrl: signUpFallbackRedirectUrl || getDynamicPublicEnvVariables().signUpFallbackRedirectUrl,
    clerkJSUrl: clerkJSUrl || getDynamicPublicEnvVariables().clerkJSUrl,
    clerkJSVersion: clerkJSVersion || getDynamicPublicEnvVariables().clerkJSVersion,
    proxyUrl: proxyUrl || getDynamicPublicEnvVariables().proxyUrl,
    domain: domain || getDynamicPublicEnvVariables().domain,
    telemetry: telemetry || {
      debug: getDynamicPublicEnvVariables().telemetryDebug,
      disabled: getDynamicPublicEnvVariables().telemetryDisabled
    }
  };
}
function ClerkProvider_1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children, $$slots, $$events, ...props } = $$props;
    const mergedProps = {
      ...props,
      ...mergeWithPublicEnvVariables(props),
      routerPush: (to) => goto(),
      routerReplace: (to) => goto(to, {})
    };
    ClerkProvider($$renderer2, spread_props([
      { initialState: page?.data?.initialState },
      mergedProps,
      {
        children: ($$renderer3) => {
          children($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function ResearcherGuard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const RESEARCHER_ORG_ID = "org_39Eb89xAUCDs7FtQL9YzJJBsqLm";
    let { children, fallback } = $$props;
    const clerk = runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null;
    const user = clerk?.user;
    const isResearcher = (() => {
      if (!runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY) return true;
      if (user?.organizationMemberships) {
        const hasResearcherOrg = user.organizationMemberships.some((membership) => membership.organization?.id === RESEARCHER_ORG_ID);
        if (hasResearcherOrg) return true;
      }
      if (user?.publicMetadata?.role === "researcher") return true;
      return false;
    })();
    if (isResearcher) {
      $$renderer2.push("<!--[-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (fallback) {
        $$renderer2.push("<!--[-->");
        fallback($$renderer2);
        $$renderer2.push(`<!---->`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    let activeTab = (() => {
      const path = page.url.pathname;
      if (path.startsWith("/participants")) return "participants";
      if (path.startsWith("/sessions")) return "sessions";
      if (path.startsWith("/settings")) return "settings";
      return "overview";
    })();
    function content($$renderer3) {
      $$renderer3.push(`<div class="researcher-container svelte-12qhfyh">`);
      if (!runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="dashboard-layout svelte-12qhfyh"><aside class="sidebar svelte-12qhfyh"><div class="sidebar-header svelte-12qhfyh"><span class="brand svelte-12qhfyh">Admin Dashboard (No Auth Mode)</span></div> <nav class="sidebar-nav svelte-12qhfyh"><a href="/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "overview" })}><span class="icon svelte-12qhfyh">📊</span> ${escape_html(overview())}</a> <a href="/participants/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "participants" })}><span class="icon svelte-12qhfyh">👥</span> ${escape_html(participants_list())}</a> <a href="/sessions/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "sessions" })}><span class="icon svelte-12qhfyh">🕒</span> ${escape_html(sessions_history())}</a> <a href="/settings/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "settings" })}><span class="icon svelte-12qhfyh">⚙️</span> ${escape_html(settings())}</a></nav></aside> <main class="main-content svelte-12qhfyh"><header class="content-header svelte-12qhfyh"><h2 class="text-xl font-bold text-gray-800">`);
        if (activeTab === "overview") {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`${escape_html(overview())}`);
        } else {
          $$renderer3.push("<!--[!-->");
          if (activeTab === "participants") {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`${escape_html(participants_list())}`);
          } else {
            $$renderer3.push("<!--[!-->");
            if (activeTab === "sessions") {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`${escape_html(sessions_history())}`);
            } else {
              $$renderer3.push("<!--[!-->");
              if (activeTab === "settings") {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`${escape_html(settings())}`);
              } else {
                $$renderer3.push("<!--[!-->");
              }
              $$renderer3.push(`<!--]-->`);
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]--></h2> <div class="header-actions"><button class="btn-refresh svelte-12qhfyh"${attr("aria-label", update())}>${escape_html(update())}</button></div></header> <div class="content-body svelte-12qhfyh" role="region" aria-label="Dashboard Content">`);
        children($$renderer3);
        $$renderer3.push(`<!----></div></main></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
        SignedOut($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="auth-required svelte-12qhfyh"><div class="auth-card svelte-12qhfyh"><h1 class="svelte-12qhfyh">${escape_html(auth_required_title())}</h1> <p class="svelte-12qhfyh">${escape_html(auth_required_desc())}</p> <div class="auth-actions svelte-12qhfyh">`);
            SignInButton($$renderer4, {
              mode: "modal",
              children: ($$renderer5) => {
                $$renderer5.push(`<button class="btn-signin svelte-12qhfyh">${escape_html(signin())}</button>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div></div></div>`);
          }
        });
        $$renderer3.push(`<!----> `);
        SignedIn($$renderer3, {
          children: ($$renderer4) => {
            {
              let fallback = function($$renderer5) {
                $$renderer5.push(`<div class="auth-required svelte-12qhfyh"><div class="auth-card svelte-12qhfyh"><h1 class="svelte-12qhfyh">Access Denied</h1> <p class="svelte-12qhfyh">研究者権限 (researcher role) が必要です。管理者にお問い合わせください。</p> <div class="auth-placeholder svelte-12qhfyh"><p class="svelte-12qhfyh">現在のユーザーにはこのページを表示する権限がありません。</p></div></div></div>`);
              };
              ResearcherGuard($$renderer4, {
                fallback,
                children: ($$renderer5) => {
                  $$renderer5.push(`<div class="dashboard-layout svelte-12qhfyh"><aside class="sidebar svelte-12qhfyh"><div class="sidebar-header svelte-12qhfyh"><span class="brand svelte-12qhfyh">Researcher Dashboard</span></div> <nav class="sidebar-nav svelte-12qhfyh"><a href="/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "overview" })}><span class="icon svelte-12qhfyh">📊</span> ${escape_html(overview())}</a> <a href="/participants/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "participants" })}><span class="icon svelte-12qhfyh">👥</span> ${escape_html(participants_list())}</a> <a href="/sessions/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "sessions" })}><span class="icon svelte-12qhfyh">🕒</span> ${escape_html(sessions_history())}</a> <a href="/settings/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "settings" })}><span class="icon svelte-12qhfyh">⚙️</span> ${escape_html(settings())}</a></nav> <div class="sidebar-footer svelte-12qhfyh">`);
                  UserButton($$renderer5, {});
                  $$renderer5.push(`<!----> <span class="user-name svelte-12qhfyh">${escape_html(admin())}</span></div></aside> <main class="main-content svelte-12qhfyh"><header class="content-header svelte-12qhfyh"><div class="flex items-center gap-4"><h2 class="text-xl font-bold text-gray-800">`);
                  if (activeTab === "overview") {
                    $$renderer5.push("<!--[-->");
                    $$renderer5.push(`${escape_html(overview())}`);
                  } else {
                    $$renderer5.push("<!--[!-->");
                    if (activeTab === "participants") {
                      $$renderer5.push("<!--[-->");
                      $$renderer5.push(`${escape_html(participants_list())}`);
                    } else {
                      $$renderer5.push("<!--[!-->");
                      if (activeTab === "sessions") {
                        $$renderer5.push("<!--[-->");
                        $$renderer5.push(`${escape_html(sessions_history())}`);
                      } else {
                        $$renderer5.push("<!--[!-->");
                        if (activeTab === "settings") {
                          $$renderer5.push("<!--[-->");
                          $$renderer5.push(`${escape_html(settings())}`);
                        } else {
                          $$renderer5.push("<!--[!-->");
                        }
                        $$renderer5.push(`<!--]-->`);
                      }
                      $$renderer5.push(`<!--]-->`);
                    }
                    $$renderer5.push(`<!--]-->`);
                  }
                  $$renderer5.push(`<!--]--></h2></div> <div class="header-actions"><button class="btn-refresh svelte-12qhfyh"${attr("aria-label", update())}>${escape_html(update())}</button></div></header> <div class="content-body svelte-12qhfyh">`);
                  children($$renderer5);
                  $$renderer5.push(`<!----></div></main></div>`);
                }
              });
            }
          }
        });
        $$renderer3.push(`<!---->`);
      }
      $$renderer3.push(`<!--]--></div>`);
    }
    if (runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY) {
      $$renderer2.push("<!--[-->");
      ClerkProvider_1($$renderer2, {
        publishableKey: runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY,
        children: ($$renderer3) => {
          content($$renderer3);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[!-->");
      content($$renderer2);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _layout as default
};
