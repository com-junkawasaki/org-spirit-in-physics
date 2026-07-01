(ns spirit-ui.data.emotion-normalization
  "Port of pkg/visualization/src/emotion-normalization.ts -- maps ~150 raw
  Hume AI emotion/label strings to 10 canonical emotion keys. Used by
  TimelineChart/TimelineVisualization (ported in a later phase); the pure
  data+logic is ported now since it has no Svelte/D3 dependency itself.

  emotion-mapping-ordered (not a plain map) preserves the TS source's
  Object.entries insertion order deliberately: normalize-emotion-name's
  substring-fallback loop returns the FIRST matching entry, and a plain
  ClojureScript hash-map does not guarantee insertion-order iteration --
  using an ordered vector-of-pairs here is required for exact behavioral
  parity, not a style choice."
  (:require [clojure.string :as str]))

(def emotion-keys [:joy :sadness :anger :fear :surprise :disgust :calm :focus :excitement :confusion])

(def metadata-fields
  #{
   "id"
   "begintime"
   "endtime"
   "beginposition"
   "endposition"
   "confidence"
   "speakerconfidence"
   "probability"
   "frame"
   "time"
   "text"
   "facex0"
   "facey0"
   "facewidth"
   "faceheight"
   "au1"
   "au2"
   "au4"
   "au5"
   "au6"
   "au7"
   "au9"
   "au10"
   "au11"
   "au12"
   "au14"
   "au15"
   "au16"
   "au17"
   "au18"
   "au19"
   "au20"
   "au22"
   "au23"
   "au24"
   "au25"
   "au26"
   "au27"
   "au28"
   "au32"
   "au34"
   "au37"
   "au38"
   "au43"
   "au53"
   "au54"
   "hand over mouth"
   "hand over eyes"
   "hand over forehead"
   "hand over face"
   "hand touching face / head"
   "beaming"
   "biting lip"
   "cheering"
   "cringe"
   "cry"
   "eyes closed"
   "face in hands"
   "frown"
   "gasp"
   "glare"
   "glaring"
   "grimace"
   "grin"
   "jaw drop"
   "laugh"
   "licking lip"
   "pout"
   "scowl"
   "smile"
   "smirk"
   "snarl"
   "squint"
   "sulking"
   "tongue out"
   "wide-eyed"
   "wince"
   "wrinkled nose"
   "1"
   "2"
   "3"
   "4"
   "5"
   "6"
   "7"
   "8"
   "9"
   "toxic"
   "severe_toxic"
   "obscene"
   "threat"
   "insult"
   "identity_hate"
    })

(def emotion-mapping-ordered
  [
   ["surprise" :surprise]
   ["joy" :joy]
   ["happiness" :joy]
   ["sadness" :sadness]
   ["sad" :sadness]
   ["anger" :anger]
   ["angry" :anger]
   ["fear" :fear]
   ["afraid" :fear]
   ["disgust" :disgust]
   ["disgusted" :disgust]
   ["calmness" :calm]
   ["calm" :calm]
   ["concentration" :focus]
   ["focus" :focus]
   ["excitement" :excitement]
   ["excited" :excitement]
   ["confusion" :confusion]
   ["confused" :confusion]
   ["aestheticappreciation" :joy]
   ["admiration" :joy]
   ["adoration" :joy]
   ["amusement" :joy]
   ["love" :joy]
   ["satisfaction" :joy]
   ["contentment" :joy]
   ["triumph" :joy]
   ["ecstasy" :joy]
   ["relief" :joy]
   ["romance" :joy]
   ["nostalgia" :joy]
   ["gratitude" :joy]
   ["realization" :joy]
   ["disappointment" :sadness]
   ["distress" :sadness]
   ["sympathy" :sadness]
   ["tiredness" :sadness]
   ["empathicpain" :sadness]
   ["pain" :sadness]
   ["annoyance" :anger]
   ["disapproval" :anger]
   ["rage" :anger]
   ["anxiety" :fear]
   ["horror" :fear]
   ["guilt" :fear]
   ["shame" :fear]
   ["contempt" :disgust]
   ["awkwardness" :confusion]
   ["doubt" :confusion]
   ["embarrassment" :confusion]
   ["interest" :focus]
   ["contemplation" :focus]
   ["entrancement" :focus]
   ["determination" :excitement]
   ["enthusiasm" :excitement]
   ["craving" :excitement]
   ["desire" :excitement]
   ["cackle" :joy]
   ["cheer" :joy]
   ["chuckle" :joy]
   ["laugh" :joy]
   ["giggle" :joy]
   ["hehe" :joy]
   ["haha" :joy]
   ["hah" :joy]
   ["ha" :joy]
   ["snicker" :joy]
   ["yay" :joy]
   ["yippee" :joy]
   ["hurray" :joy]
   ["awe" :joy]
   ["cry" :sadness]
   ["moan" :sadness]
   ["sob" :sadness]
   ["wail" :sadness]
   ["wheep" :sadness]
   ["whimper" :sadness]
   ["sigh" :sadness]
   ["growl" :anger]
   ["grunt" :anger]
   ["roar" :anger]
   ["scream" :anger]
   ["screech" :anger]
   ["shout" :anger]
   ["shriek" :anger]
   ["grr" :anger]
   ["gasp" :fear]
   ["pant" :fear]
   ["yelp" :fear]
   ["eek" :fear]
   ["hiss" :disgust]
   ["eww" :disgust]
   ["yuck" :disgust]
   ["wow" :surprise]
   ["oh" :surprise]
   ["ohh" :surprise]
   ["ooh" :surprise]
   ["ah" :surprise]
   ["aha" :surprise]
   ["ahh" :surprise]
   ["woah" :surprise]
   ["argh" :anger]
   ["aww" :joy]
   ["ooph" :surprise]
   ["ouch" :sadness]
   ["oww" :sadness]
   ["pff" :disgust]
   ["phew" :calm]
   ["tsk" :anger]
   ["ugh" :disgust]
   ["uh" :confusion]
   ["uhhuh" :confusion]
   ["umm" :confusion]
   ["hmm" :confusion]
   ["huh" :confusion]
   ["mhm" :confusion]
   ["mmm" :confusion]
   ["whee" :joy]
   ["whew" :calm]
   ["hoot" :joy]
   ["howl" :anger]
   ["snort" :disgust]
   ["yawn" :sadness]
   ])

(def ^:private emotion-mapping (into {} emotion-mapping-ordered))

(defn- strip-parens [s]
  (-> s
      (str/replace #"\s*\(negative\)" "")
      (str/replace #"\s*\(positive\)" "")
      (str/replace #"\s*\([^)]*\)" "")
      str/trim))

(defn- strip-word-separators [s]
  (str/replace s #"[\s\-_]" ""))

(defn normalize-emotion-name
  "-> emotion keyword, or nil if name is metadata / unrecognized."
  [name]
  (when (and name (string? name))
    (let [name-lower (str/trim (str/lower-case name))]
      (when-not (contains? metadata-fields name-lower)
        (let [cleaned (-> name-lower strip-parens strip-word-separators)]
          (or (get emotion-mapping cleaned)
              (some (fn [[k v]] (when (or (str/includes? cleaned k) (str/includes? k cleaned)) v))
                    emotion-mapping-ordered)
              (some #{(keyword cleaned)} emotion-keys)))))))

(defn metadata-field? [name]
  (if-not (and name (string? name))
    true
    (let [name-lower (str/trim (str/lower-case name))]
      (boolean (or (contains? metadata-fields name-lower)
                   (nil? (normalize-emotion-name name)))))))
