import { b as attr_class, d as attr, e as stringify, h as head } from "../../../../chunks/index.js";
import { p as page } from "../../../../chunks/index3.js";
import "d3";
import "../../../../chunks/TimelineVisualization.svelte_svelte_type_style_lang.js";
import "../../../../chunks/connect.js";
import { i as escape_html } from "../../../../chunks/context.js";
const EMOTION_KEYS = ["joy", "sadness", "anger", "fear", "surprise", "disgust", "calm", "focus", "excitement", "confusion"];
const METADATA_FIELDS = /* @__PURE__ */ new Set([
  "id",
  "begintime",
  "endtime",
  "beginposition",
  "endposition",
  "confidence",
  "speakerconfidence",
  "probability",
  "frame",
  "time",
  "text",
  "facex0",
  "facey0",
  "facewidth",
  "faceheight",
  "au1",
  "au2",
  "au4",
  "au5",
  "au6",
  "au7",
  "au9",
  "au10",
  "au11",
  "au12",
  "au14",
  "au15",
  "au16",
  "au17",
  "au18",
  "au19",
  "au20",
  "au22",
  "au23",
  "au24",
  "au25",
  "au26",
  "au27",
  "au28",
  "au32",
  "au34",
  "au37",
  "au38",
  "au43",
  "au53",
  "au54",
  "hand over mouth",
  "hand over eyes",
  "hand over forehead",
  "hand over face",
  "hand touching face / head",
  "beaming",
  "biting lip",
  "cheering",
  "cringe",
  "cry",
  "eyes closed",
  "face in hands",
  "frown",
  "gasp",
  "glare",
  "glaring",
  "grimace",
  "grin",
  "jaw drop",
  "laugh",
  "licking lip",
  "pout",
  "scowl",
  "smile",
  "smirk",
  "snarl",
  "squint",
  "sulking",
  "tongue out",
  "wide-eyed",
  "wince",
  "wrinkled nose",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "toxic",
  "severe_toxic",
  "obscene",
  "threat",
  "insult",
  "identity_hate"
]);
function normalizeEmotionName(name) {
  if (!name || typeof name !== "string") {
    return null;
  }
  const nameLower = name.toLowerCase().trim();
  if (METADATA_FIELDS.has(nameLower)) {
    return null;
  }
  let cleaned = nameLower.replace(/\s*\(negative\)/g, "").replace(/\s*\(positive\)/g, "").replace(/\s*\(.*?\)/g, "").trim();
  cleaned = cleaned.replace(/[\s\-_]/g, "");
  const mapping = {
    // Basic emotions - 直接マッピング
    "surprise": "surprise",
    "joy": "joy",
    "happiness": "joy",
    "sadness": "sadness",
    "sad": "sadness",
    "anger": "anger",
    "angry": "anger",
    "fear": "fear",
    "afraid": "fear",
    "disgust": "disgust",
    "disgusted": "disgust",
    // Extended emotions
    "calmness": "calm",
    "calm": "calm",
    "concentration": "focus",
    "focus": "focus",
    "excitement": "excitement",
    "excited": "excitement",
    "confusion": "confusion",
    "confused": "confusion",
    // Positive emotions → joy
    "aestheticappreciation": "joy",
    "admiration": "joy",
    "adoration": "joy",
    "amusement": "joy",
    "love": "joy",
    "satisfaction": "joy",
    "contentment": "joy",
    "triumph": "joy",
    "ecstasy": "joy",
    "relief": "joy",
    "romance": "joy",
    "nostalgia": "joy",
    "gratitude": "joy",
    "realization": "joy",
    // Negative emotions → sadness
    "disappointment": "sadness",
    "distress": "sadness",
    "sympathy": "sadness",
    "tiredness": "sadness",
    "empathicpain": "sadness",
    "pain": "sadness",
    // Anger-related
    "annoyance": "anger",
    "disapproval": "anger",
    "rage": "anger",
    // Fear-related
    "anxiety": "fear",
    "horror": "fear",
    "guilt": "fear",
    "shame": "fear",
    // Disgust-related
    "contempt": "disgust",
    // contemptはangerとdisgustの両方にマッピング可能だが、disgustを優先
    // Confusion-related
    "awkwardness": "confusion",
    "doubt": "confusion",
    // doubtはfearとconfusionの両方にマッピング可能だが、confusionを優先
    "embarrassment": "confusion",
    // Interest/Concentration → focus
    "interest": "focus",
    "contemplation": "focus",
    "entrancement": "focus",
    // Determination → excitement
    "determination": "excitement",
    "enthusiasm": "excitement",
    "craving": "excitement",
    "desire": "excitement",
    // Vocal expressions (burst emotions) → joy
    "cackle": "joy",
    "cheer": "joy",
    "chuckle": "joy",
    "laugh": "joy",
    "giggle": "joy",
    "hehe": "joy",
    "haha": "joy",
    "hah": "joy",
    "ha": "joy",
    "snicker": "joy",
    "yay": "joy",
    "yippee": "joy",
    "hurray": "joy",
    "awe": "joy",
    // Vocal expressions → sadness
    "cry": "sadness",
    "moan": "sadness",
    "sob": "sadness",
    "wail": "sadness",
    "wheep": "sadness",
    "whimper": "sadness",
    "sigh": "sadness",
    // Vocal expressions → anger
    "growl": "anger",
    "grunt": "anger",
    "roar": "anger",
    "scream": "anger",
    "screech": "anger",
    "shout": "anger",
    "shriek": "anger",
    "grr": "anger",
    // Vocal expressions → fear
    "gasp": "fear",
    "pant": "fear",
    "yelp": "fear",
    "eek": "fear",
    // Vocal expressions → disgust
    "hiss": "disgust",
    "eww": "disgust",
    "yuck": "disgust",
    // Vocal expressions → surprise
    "wow": "surprise",
    "oh": "surprise",
    "ohh": "surprise",
    "ooh": "surprise",
    "ah": "surprise",
    "aha": "surprise",
    "ahh": "surprise",
    "woah": "surprise",
    // Other vocal expressions
    "argh": "anger",
    "aww": "joy",
    "ooph": "surprise",
    "ouch": "sadness",
    "oww": "sadness",
    "pff": "disgust",
    "phew": "calm",
    "tsk": "anger",
    "ugh": "disgust",
    "uh": "confusion",
    "uhhuh": "confusion",
    "umm": "confusion",
    "hmm": "confusion",
    "huh": "confusion",
    "mhm": "confusion",
    "mmm": "confusion",
    "whee": "joy",
    "whew": "calm",
    "hoot": "joy",
    "howl": "anger",
    "snort": "disgust",
    "yawn": "sadness"
  };
  if (cleaned in mapping) {
    return mapping[cleaned];
  }
  for (const [key, value] of Object.entries(mapping)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return value;
    }
  }
  if (EMOTION_KEYS.includes(cleaned)) {
    return cleaned;
  }
  return null;
}
function TimelineVisualization($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      hideFilters = false
    } = $$props;
    let data = [];
    let emotionVectors = [];
    let filters = {
      timeScale: 1
    };
    let shellRadius = 300;
    const anchor2d = [
      { name: "Joy", x: 0.15, y: 0.85, color: "#f59e0b" },
      { name: "Sadness", x: 0.7, y: 0.45, color: "#1f2937" },
      { name: "Anger", x: 0.82, y: 0.25, color: "#ef4444" },
      { name: "Fear", x: 0.92, y: 0.1, color: "#a78bfa" },
      { name: "Disgust", x: 0.78, y: 0.52, color: "#10b981" },
      { name: "Calmness", x: 0.28, y: 0.7, color: "#93c5fd" },
      { name: "Interest", x: 0.35, y: 0.55, color: "#60a5fa" },
      { name: "Surprise", x: 0.4, y: 0.2, color: "#22c55e" },
      { name: "Confusion", x: 0.48, y: 0.35, color: "#64748b" },
      { name: "Determination", x: 0.22, y: 0.85, color: "#f97316" }
    ];
    const anchorToKey = {
      Joy: "joy",
      Sadness: "sadness",
      Anger: "anger",
      Fear: "fear",
      Disgust: "disgust",
      Calmness: "calm",
      Interest: "focus",
      Surprise: "surprise",
      Confusion: "confusion",
      Determination: "excitement"
    };
    const toSphere = (x01, y01, radius) => {
      const u = (x01 - 0.5) * Math.PI * 1.6;
      const v = (y01 - 0.5) * Math.PI;
      const cx = Math.cos(v) * Math.cos(u);
      const cy = Math.cos(v) * Math.sin(u);
      const cz = Math.sin(v);
      return [radius * cx, radius * cy, radius * cz];
    };
    let availableWords = (() => {
      const wordScores = /* @__PURE__ */ new Map();
      data.forEach((d) => {
        if (d.word && d.word !== "Unknown") {
          const currentScore = wordScores.get(d.word) || 0;
          const newScore = currentScore + (d.reactionValue || 0) + (d.reactionTime ? 1e3 / d.reactionTime : 0);
          wordScores.set(d.word, newScore);
        }
      });
      return Array.from(wordScores.entries()).map(([word, score]) => ({
        word,
        score,
        selected: force3dFilters.selectedWords.includes(word)
      })).sort((a, b) => b.score - a.score);
    })();
    (() => {
      if (data.length === 0) return { nodes: [], links: [] };
      const anchorNodes = anchor2d.filter((a) => {
        const emotionKey = anchorToKey[a.name];
        if (!emotionKey) return true;
        return force3dFilters[emotionKey] === true;
      }).map((a, idx) => {
        const [x, y, z] = toSphere(a.x, a.y, shellRadius);
        return {
          id: `anchor-${idx}`,
          label: a.name,
          scale: 6,
          fixed: true,
          nodeType: "anchor",
          initial: [x, y, z],
          color: a.color
        };
      });
      const topWordsList = availableWords.slice(0, force3dFilters.topWords).map((w) => w.word);
      const selectedOrTopWords = force3dFilters.selectedWords.length > 0 ? force3dFilters.selectedWords : topWordsList;
      const wordNodes = data.filter((d) => d.word && d.word !== "Unknown" && selectedOrTopWords.includes(d.word)).map((d, i) => {
        const vec = emotionVectors.find((v) => v.word === d.word);
        const emotion = {};
        if (vec) {
          if (vec.joySum && force3dFilters.joy) emotion.joy = Number(vec.joySum);
          if (vec.sadnessSum && force3dFilters.sadness) emotion.sadness = Number(vec.sadnessSum);
          if (vec.angerSum && force3dFilters.anger) emotion.anger = Number(vec.angerSum);
          if (vec.fearSum && force3dFilters.fear) emotion.fear = Number(vec.fearSum);
          if (vec.surpriseSum && force3dFilters.surprise) emotion.surprise = Number(vec.surpriseSum);
          if (vec.disgustSum && force3dFilters.disgust) emotion.disgust = Number(vec.disgustSum);
          if (vec.calmSum && force3dFilters.calm) emotion.calm = Number(vec.calmSum);
          if (vec.focusSum && force3dFilters.focus) emotion.focus = Number(vec.focusSum);
          if (vec.excitementSum && force3dFilters.excitement) emotion.excitement = Number(vec.excitementSum);
          if (vec.confusionSum && force3dFilters.confusion) emotion.confusion = Number(vec.confusionSum);
        }
        const filteredEmotions = d.emotions?.filter((e) => {
          const type = e.fileType?.toLowerCase() || "";
          if (type.includes("prosody") && !force3dFilters.prosody) return false;
          if (type.includes("burst") && !force3dFilters.burst) return false;
          if (type.includes("face") && !force3dFilters.face) return false;
          if (type.includes("language") && !force3dFilters.language) return false;
          return true;
        }) || [];
        const rv = d.reactionValue || 0;
        const phys = Array.isArray(d.physiological) ? d.physiological.length : 0;
        const rt = (d.reactionTime || 0) / 5e3;
        filteredEmotions.forEach((e) => {
          const emotionName = normalizeEmotionName(e.name);
          if (emotionName && force3dFilters[emotionName]) {
            emotion[emotionName] = (emotion[emotionName] || 0) + e.score;
          }
        });
        const nodeScale = 0.5 + rv * 3 + phys * 0.2 + rt * 0.8;
        return {
          id: `node-${i}`,
          label: d.word,
          scale: nodeScale,
          color: "#1e40af",
          emotion: Object.keys(emotion).length > 0 ? emotion : void 0
        };
      });
      const allNodes = [...anchorNodes, ...wordNodes];
      const links = [];
      for (let i = 0; i < wordNodes.length - 1; i++) {
        links.push({
          source: anchorNodes.length + i,
          target: anchorNodes.length + i + 1,
          weight: 0.5
        });
      }
      wordNodes.forEach((node, i) => {
        if (node.emotion) {
          anchorNodes.forEach((anchor, ai) => {
            const key = anchorToKey[anchor.label];
            if (key && node.emotion[key]) {
              const score = node.emotion[key];
              if (score > 0.1) {
                links.push({
                  source: anchorNodes.length + i,
                  target: ai,
                  weight: score * 0.8,
                  mode: "tension"
                });
              }
            }
          });
        }
      });
      return { nodes: allNodes, links };
    })();
    let force3dFilters = {
      joy: true,
      sadness: true,
      anger: true,
      fear: true,
      surprise: true,
      disgust: true,
      calm: true,
      focus: true,
      excitement: true,
      confusion: true,
      prosody: true,
      burst: true,
      face: true,
      language: true,
      topWords: 100,
      selectedWords: []
    };
    $$renderer2.push(`<div class="timeline-visualization-container flex flex-col space-y-8 svelte-1lcg83w"><div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm p-2 rounded-2xl border border-gray-200 dark:border-gray-700 svelte-1lcg83w"><div class="flex p-1 bg-gray-200/50 dark:bg-gray-900/50 rounded-xl svelte-1lcg83w"><button${attr_class(
      `px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${stringify(
        "bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400"
      )}`,
      "svelte-1lcg83w"
    )}>Timeline</button> <button${attr_class(
      `px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${stringify("text-gray-500 hover:text-gray-700")}`,
      "svelte-1lcg83w"
    )}>3D Space</button></div> `);
    if (!hideFilters) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center gap-4 px-4 svelte-1lcg83w"><div class="flex items-center gap-2 svelte-1lcg83w"><span class="text-[10px] font-black text-gray-400 uppercase tracking-widest svelte-1lcg83w">Time Scale</span> <input type="range"${attr("value", filters.timeScale)} min="0.1" max="5.0" step="0.1" class="w-32 accent-blue-500 svelte-1lcg83w"/></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex flex-col items-center justify-center py-32 space-y-6 svelte-1lcg83w"><div class="spinner svelte-1lcg83w"></div> <p class="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse svelte-1lcg83w">Analyzing Neural Patterns...</p></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let participantId = page.params.id;
    head("ymn26j", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Analysis | Researcher Dashboard</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-6"><div class="flex items-center justify-between"><div class="space-y-1"><div class="flex items-center gap-2"><span class="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded uppercase tracking-widest">Participant Analysis</span></div> <p class="text-sm font-mono text-gray-500">${escape_html(participantId)}</p></div> <div class="flex items-center gap-3"><button class="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-md transition-all">Export Report</button> <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all">Share Insights</button></div></div> <div class="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">`);
    if (participantId) {
      $$renderer2.push("<!--[-->");
      TimelineVisualization($$renderer2, {});
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  _page as default
};
