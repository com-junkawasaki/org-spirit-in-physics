use serde::{Deserialize, Serialize};
use rust_decimal::Decimal;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysiologicalData {
    pub records: Vec<PhysiologicalRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysiologicalRecord {
    #[serde(rename = "Time_Sec")]
    pub time_sec: f64,
    #[serde(rename = "Ch1")]
    pub ch1: f64,
    #[serde(rename = "Ch2")]
    pub ch2: f64,
    #[serde(rename = "Ch3")]
    pub ch3: f64,
    #[serde(rename = "Ch4")]
    pub ch4: f64,
    #[serde(rename = "Ch5")]
    pub ch5: f64,
    #[serde(rename = "Ch6")]
    pub ch6: f64,
    #[serde(rename = "Ch7")]
    pub ch7: f64,
    #[serde(rename = "Ch8")]
    pub ch8: f64,
}

impl PhysiologicalRecord {
    /// Convert time_sec to milliseconds
    pub fn time_ms(&self) -> i64 {
        (self.time_sec * 1000.0) as i64
    }

    /// Get skin potential value (typically Ch1 or Ch2)
    /// Returns the average of Ch1 and Ch2 as skin potential
    pub fn skin_potential(&self) -> Decimal {
        Decimal::from_f64_retain((self.ch1 + self.ch2) / 2.0)
            .unwrap_or(Decimal::ZERO)
    }

    /// Get all channel values as a vector
    pub fn channels(&self) -> Vec<Decimal> {
        vec![
            Decimal::from_f64_retain(self.ch1).unwrap_or(Decimal::ZERO),
            Decimal::from_f64_retain(self.ch2).unwrap_or(Decimal::ZERO),
            Decimal::from_f64_retain(self.ch3).unwrap_or(Decimal::ZERO),
            Decimal::from_f64_retain(self.ch4).unwrap_or(Decimal::ZERO),
            Decimal::from_f64_retain(self.ch5).unwrap_or(Decimal::ZERO),
            Decimal::from_f64_retain(self.ch6).unwrap_or(Decimal::ZERO),
            Decimal::from_f64_retain(self.ch7).unwrap_or(Decimal::ZERO),
            Decimal::from_f64_retain(self.ch8).unwrap_or(Decimal::ZERO),
        ]
    }
}

