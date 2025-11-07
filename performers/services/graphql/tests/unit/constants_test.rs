use graphql::constants::*;

#[test]
fn test_jung_stimulus_words_access() {
    assert!(!JUNG_STIMULUS_WORDS.is_empty(), "Should have stimulus words");
    
    // Test accessing specific words
    let word1 = JUNG_STIMULUS_WORDS.get(&1);
    assert!(word1.is_some(), "Word 1 should exist");
    
    let word = word1.unwrap();
    assert_eq!(word.japanese, "頭");
    assert_eq!(word.english, "head");
    assert_eq!(word.pronunciation, "あたま");
}

#[test]
fn test_jung_stimulus_words_all_entries() {
    // Test that all expected entries exist
    for i in 1..=100 {
        if let Some(word) = JUNG_STIMULUS_WORDS.get(&i) {
            assert!(!word.japanese.is_empty(), "Japanese should not be empty");
            assert!(!word.english.is_empty(), "English should not be empty");
            assert!(!word.pronunciation.is_empty(), "Pronunciation should not be empty");
        }
    }
}

#[test]
fn test_stimulus_word_structure() {
    let word = JUNG_STIMULUS_WORDS.get(&1).unwrap();
    
    // Test that the word has all required fields
    assert!(!word.japanese.is_empty());
    assert!(!word.english.is_empty());
    assert!(!word.pronunciation.is_empty());
}

#[test]
fn test_stimulus_word_specific_values() {
    // Test a few specific words
    let word2 = JUNG_STIMULUS_WORDS.get(&2).unwrap();
    assert_eq!(word2.japanese, "緑");
    assert_eq!(word2.english, "green");
    
    let word3 = JUNG_STIMULUS_WORDS.get(&3).unwrap();
    assert_eq!(word3.japanese, "水");
    assert_eq!(word3.english, "water");
}

