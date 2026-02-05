import { g as ensure_array_like, b as attr_class, d as attr, h as head } from "../../../chunks/index.js";
import { i as escape_html } from "../../../chunks/context.js";
function SessionHistory($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const recentSessions = [
      {
        id: "sess_1",
        participantId: "P001",
        date: "2025-12-26 14:20",
        type: "言語連想検査",
        status: "完了",
        artifacts: ["video", "image", "csv"]
      },
      {
        id: "sess_2",
        participantId: "P002",
        date: "2025-12-26 13:45",
        type: "言語連想検査",
        status: "完了",
        artifacts: ["video", "image"]
      },
      {
        id: "sess_3",
        participantId: "P003",
        date: "2025-12-26 12:10",
        type: "性格診断",
        status: "処理中",
        artifacts: ["image"]
      }
    ];
    function getArtifactIcon(type) {
      switch (type) {
        case "video":
          return "🎥";
        case "image":
          return "🖼️";
        case "csv":
          return "📊";
        default:
          return "📁";
      }
    }
    $$renderer2.push(`<div class="session-history-container svelte-7lqniv"><div class="filter-bar svelte-7lqniv"><select class="svelte-7lqniv">`);
    $$renderer2.option({}, ($$renderer3) => {
      $$renderer3.push(`全ての検査タイプ`);
    });
    $$renderer2.option({}, ($$renderer3) => {
      $$renderer3.push(`言語連想検査`);
    });
    $$renderer2.option({}, ($$renderer3) => {
      $$renderer3.push(`性格診断`);
    });
    $$renderer2.push(`</select> <select class="svelte-7lqniv">`);
    $$renderer2.option({}, ($$renderer3) => {
      $$renderer3.push(`全てのステータス`);
    });
    $$renderer2.option({}, ($$renderer3) => {
      $$renderer3.push(`完了`);
    });
    $$renderer2.option({}, ($$renderer3) => {
      $$renderer3.push(`処理中`);
    });
    $$renderer2.option({}, ($$renderer3) => {
      $$renderer3.push(`エラー`);
    });
    $$renderer2.push(`</select></div> <div class="timeline svelte-7lqniv"><!--[-->`);
    const each_array = ensure_array_like(recentSessions);
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let session = each_array[$$index_1];
      $$renderer2.push(`<div class="session-card svelte-7lqniv"><div class="session-time svelte-7lqniv"><span class="date svelte-7lqniv">${escape_html(session.date.split(" ")[0])}</span> <span class="time svelte-7lqniv">${escape_html(session.date.split(" ")[1])}</span></div> <div class="session-main svelte-7lqniv"><div class="session-header svelte-7lqniv"><h4 class="svelte-7lqniv">${escape_html(session.type)}</h4> <span${attr_class("status-tag svelte-7lqniv", void 0, { "processing": session.status === "処理中" })}>${escape_html(session.status)}</span></div> <div class="session-details svelte-7lqniv"><span class="participant-link svelte-7lqniv">被験者: ${escape_html(session.participantId)}</span> <span class="session-id">ID: ${escape_html(session.id)}</span></div> <div class="artifacts svelte-7lqniv"><!--[-->`);
      const each_array_1 = ensure_array_like(session.artifacts);
      for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
        let art = each_array_1[$$index];
        $$renderer2.push(`<button class="artifact-link svelte-7lqniv"${attr("title", art)}>${escape_html(getArtifactIcon(art))} ${escape_html(art)}</button>`);
      }
      $$renderer2.push(`<!--]--></div></div> <div class="session-actions"><button class="btn-detail svelte-7lqniv">詳細レポート</button></div></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
function _page($$renderer) {
  head("98wg7q", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Sessions | Researcher Dashboard</title>`);
    });
  });
  $$renderer.push(`<div class="page-container svelte-98wg7q">`);
  SessionHistory($$renderer);
  $$renderer.push(`<!----></div>`);
}
export {
  _page as default
};
