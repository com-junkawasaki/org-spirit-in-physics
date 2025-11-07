use graphql::constants::*;

#[test]
fn test_jung_stimulus_words_structure() {
    // Test that JUNG_STIMULUS_WORDS is accessible and has expected structure
    assert!(JUNG_STIMULUS_WORDS.len() > 0, "Should have stimulus words");
    
    // Test a specific word
    if let Some(word) = JUNG_STIMULUS_WORDS.get(&1) {
        assert_eq!(word.japanese, "頭");
        assert_eq!(word.english, "head");
        assert_eq!(word.pronunciation, "あたま");
    }
}

#[test]
fn test_jung_stimulus_words_count() {
    // Should have 100 words
    assert_eq!(JUNG_STIMULUS_WORDS.len(), 100);
}

#[test]
fn test_jung_test_welcome_message() {
    // Test that welcome message is accessible
    assert!(JUNG_TEST_WELCOME_MESSAGE.len() > 0);
    assert!(JUNG_TEST_WELCOME_MESSAGE.contains("ユング"));
    assert!(JUNG_TEST_WELCOME_MESSAGE.contains("言語連想検査"));
}

#[test]
fn test_stimulus_word_structure() {
    // Test StimulusWord struct
    let word = StimulusWord {
        japanese: "テスト",
        english: "test",
        pronunciation: "てすと",
    };
    
    assert_eq!(word.japanese, "テスト");
    assert_eq!(word.english, "test");
    assert_eq!(word.pronunciation, "てすと");
}
