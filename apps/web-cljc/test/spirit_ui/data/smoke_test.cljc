(ns spirit-ui.data.smoke-test
  (:require [cljs.test :refer [deftest is]]
            [spirit-ui.data.illness-codes :as illness]
            [spirit-ui.data.jung-stimulus-words :as jung]
            [spirit-ui.data.emotion-normalization :as emo]))

(deftest test-illness-codes-count
  (is (= 32 (count illness/illness-codes))))

(deftest test-jung-words-count
  (is (= 100 (count jung/jung-stimulus-words))))

(deftest test-emotion-normalize-basics
  (is (= :joy (emo/normalize-emotion-name "Happiness")))
  (is (= :surprise (emo/normalize-emotion-name "Surprise (negative)")))
  (is (nil? (emo/normalize-emotion-name "confidence")))
  (is (true? (emo/metadata-field? "confidence")))
  (is (false? (emo/metadata-field? "joy"))))
