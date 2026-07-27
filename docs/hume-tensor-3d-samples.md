# Physiological Word Distance

Stimulus words are embedded by non-voluntary Hume response signatures. Field height is response energy, boundary is local response-gradient/isolation, residual is deviation from the group mean for the same stimulus, and time traces follow stimulus order.

## Tensor Model

```text
R[participant, stimulus_word, modality, emotion]
R = baseline-corrected non-voluntary response signature
modality = language, prosody, face, burst
emotion dims = 48
distance = cosine distance over baseline-corrected modality x emotion response signature
3D = classical MDS over physiological response distance
```

## Summary

- word response nodes: 700
- unique words: 100
- participants: 7
- emotion anchors: 0
- word anchors: 0
- total nodes: 714
- modalities: 4
- emotion features: 48
- flattened features: 192
- time bin seconds: 10.0
- links: 2551
- word alignment: {'aligned': 846, 'fallback': 0, 'unmapped': 0}
- projection explained variance ratio: 0.249, 0.119, 0.084
- cosine distance min/median/max: 0.0452 / 1.0055 / 1.9074

## Word Response Nodes

| word | participant | overlap | response energy | 3D coordinate | top mean emotions |
| --- | --- | --- | --- | --- | --- |
| `お金` | `2a0d7a69` | 12.0s | 0.2817 | (-75.16, -79.52, -53.69) | Calmness=0.145, Interest=0.144, Concentration=0.126 |
| `かわいい` | `2a0d7a69` | 12.0s | 0.2994 | (-68.27, -68.86, -64.52) | Interest=0.150, Calmness=0.145, Concentration=0.142 |
| `きれいな` | `2a0d7a69` | 12.0s | 0.3183 | (-68.26, 64.39, -39.27) | Interest=0.175, Amusement=0.157, Calmness=0.139 |
| `ご飯` | `2a0d7a69` | 12.0s | 0.5024 | (79.80, -61.46, -75.66) | Interest=0.135, Calmness=0.131, Boredom=0.107 |
| `りんご` | `2a0d7a69` | 12.0s | 0.2628 | (86.83, -94.03, -93.54) | Calmness=0.148, Amusement=0.143, Interest=0.135 |
| `インク` | `2a0d7a69` | 12.0s | 0.4523 | (55.89, -111.74, -19.98) | Amusement=0.160, Calmness=0.147, Interest=0.147 |
| `ガラス` | `2a0d7a69` | 12.0s | 0.4093 | (113.56, -48.00, -89.47) | Calmness=0.128, Boredom=0.127, Amusement=0.126 |
| `キス` | `2a0d7a69` | 12.0s | 0.3319 | (-66.67, 63.40, -31.28) | Interest=0.156, Calmness=0.155, Amusement=0.134 |
| `コウノトリ` | `2a0d7a69` | 12.0s | 0.3348 | (-49.62, 12.68, -118.95) | Excitement=0.106, Amusement=0.105, Interest=0.104 |
| `ドア` | `2a0d7a69` | 12.0s | 0.8091 | (18.05, 46.45, -0.07) | Excitement=0.100, Joy=0.088, Interest=0.087 |
| `ノート` | `2a0d7a69` | 12.0s | 0.4422 | (116.65, 82.10, -22.65) | Calmness=0.177, Interest=0.167, Excitement=0.153 |
| `プライド` | `2a0d7a69` | 12.0s | 0.4756 | (-30.67, -52.93, -82.72) | Calmness=0.089, Interest=0.079, Excitement=0.078 |
| `不正` | `2a0d7a69` | 12.0s | 0.3485 | (-63.09, 105.47, -32.45) | Interest=0.158, Excitement=0.140, Calmness=0.139 |
| `争う` | `2a0d7a69` | 12.0s | 0.2782 | (-77.39, -34.09, -49.27) | Interest=0.156, Calmness=0.141, Concentration=0.135 |
| `亡くなる` | `2a0d7a69` | 12.0s | 0.6732 | (158.00, -21.23, 29.20) | Amusement=0.221, Interest=0.171, Calmness=0.155 |
| `人参` | `2a0d7a69` | 12.0s | 0.4514 | (-33.63, 87.14, -86.12) | Excitement=0.123, Interest=0.121, Calmness=0.113 |
| `侮辱` | `2a0d7a69` | 12.0s | 0.3605 | (-57.92, 22.71, -36.85) | Interest=0.202, Calmness=0.183, Concentration=0.163 |
| `兄弟` | `2a0d7a69` | 12.0s | 0.3969 | (-39.09, 81.73, -105.83) | Excitement=0.128, Interest=0.115, Calmness=0.111 |
| `冷たい` | `2a0d7a69` | 12.0s | 0.2883 | (-75.87, -29.19, -43.90) | Calmness=0.165, Interest=0.155, Concentration=0.124 |
| `別れる` | `2a0d7a69` | 12.0s | 0.3145 | (-66.83, -11.48, -39.93) | Interest=0.188, Calmness=0.151, Amusement=0.148 |
| `刺す` | `2a0d7a69` | 12.0s | 0.2919 | (-8.44, 53.08, -46.47) | Calmness=0.165, Interest=0.162, Amusement=0.150 |
| `古い` | `2a0d7a69` | 12.0s | 0.2698 | (-65.72, 58.23, -58.77) | Interest=0.160, Calmness=0.143, Excitement=0.125 |
| `同情` | `2a0d7a69` | 11.5s | 0.6373 | (166.98, 6.97, 24.68) | Calmness=0.184, Amusement=0.175, Interest=0.173 |
| `嘘` | `2a0d7a69` | 12.0s | 0.6702 | (32.17, 10.85, -41.13) | Excitement=0.094, Boredom=0.090, Interest=0.088 |
| `塗る` | `2a0d7a69` | 12.0s | 0.2784 | (-79.07, 8.43, -54.17) | Calmness=0.159, Interest=0.147, Amusement=0.136 |
| `塩` | `2a0d7a69` | 12.0s | 0.3697 | (121.89, 43.55, -29.21) | Interest=0.167, Calmness=0.166, Amusement=0.143 |
| `変` | `2a0d7a69` | 12.0s | 0.3087 | (-67.17, 82.11, -47.57) | Interest=0.186, Amusement=0.138, Excitement=0.135 |
| `大きい` | `2a0d7a69` | 12.0s | 0.2807 | (89.66, 119.93, -87.33) | Interest=0.158, Amusement=0.146, Calmness=0.128 |
| `女` | `2a0d7a69` | 12.0s | 0.4678 | (-29.22, -58.84, -94.22) | Calmness=0.111, Interest=0.109, Boredom=0.084 |
| `嬉しい` | `2a0d7a69` | 12.0s | 0.3119 | (-68.83, 20.19, -42.78) | Calmness=0.149, Interest=0.138, Boredom=0.125 |
| `子供` | `2a0d7a69` | 12.0s | 0.4602 | (-31.41, -55.50, -89.37) | Interest=0.094, Calmness=0.094, Amusement=0.088 |
| `家` | `2a0d7a69` | 12.0s | 0.3642 | (-59.74, 126.19, -40.05) | Interest=0.167, Calmness=0.155, Excitement=0.145 |
| `家族` | `2a0d7a69` | 12.0s | 0.3142 | (-68.52, 78.68, -46.99) | Interest=0.159, Calmness=0.155, Amusement=0.145 |
| `山` | `2a0d7a69` | 12.0s | 0.3063 | (-70.53, 33.07, -41.91) | Interest=0.158, Calmness=0.148, Amusement=0.140 |
| `干し草` | `2a0d7a69` | 12.0s | 0.4574 | (68.88, -68.43, -86.86) | Calmness=0.104, Interest=0.101, Amusement=0.100 |
| `年月` | `2a0d7a69` | 12.0s | 0.4436 | (-34.08, -55.66, -85.98) | Amusement=0.126, Interest=0.096, Calmness=0.094 |
| `幸運` | `2a0d7a69` | 12.0s | 0.6414 | (136.93, -45.23, -33.43) | Boredom=0.160, Calmness=0.119, Disappointment=0.116 |
| `心配` | `2a0d7a69` | 12.0s | 0.2574 | (-81.86, -45.45, -62.47) | Interest=0.148, Calmness=0.148, Boredom=0.128 |
| `怒り` | `2a0d7a69` | 12.0s | 0.4552 | (73.20, 40.96, -16.62) | Amusement=0.212, Calmness=0.171, Interest=0.162 |
| `怖がる` | `2a0d7a69` | 12.0s | 0.2052 | (-98.21, 16.58, -103.69) | Interest=0.164, Calmness=0.144, Concentration=0.126 |
| `悲しい` | `2a0d7a69` | 12.0s | 0.3091 | (-70.68, -7.87, -51.47) | Interest=0.154, Calmness=0.149, Amusement=0.144 |
| `打つ` | `2a0d7a69` | 12.0s | 0.3526 | (-60.17, -75.22, -36.76) | Interest=0.136, Calmness=0.125, Concentration=0.122 |
| `指` | `2a0d7a69` | 6.0s | 0.3158 | (-72.20, -138.39, -56.65) | Calmness=0.152, Interest=0.144, Concentration=0.118 |
| `支払い` | `2a0d7a69` | 12.0s | 0.3208 | (-67.36, -12.65, -37.49) | Interest=0.152, Calmness=0.150, Amusement=0.131 |
| `料理` | `2a0d7a69` | 12.0s | 0.4547 | (-32.41, -67.94, -88.01) | Calmness=0.107, Interest=0.107, Boredom=0.082 |
| `新しい` | `2a0d7a69` | 12.0s | 0.4873 | (151.72, 21.88, -7.91) | Interest=0.170, Calmness=0.169, Boredom=0.166 |
| `旅行` | `2a0d7a69` | 12.0s | 0.3363 | (123.56, 8.11, -34.88) | Calmness=0.189, Interest=0.185, Amusement=0.139 |
| `木` | `2a0d7a69` | 12.0s | 1.1135 | (-2.41, 22.73, 69.57) | Excitement=0.080, Interest=0.078, Calmness=0.063 |
| `本` | `2a0d7a69` | 12.0s | 0.2735 | (-78.84, -18.20, -47.78) | Interest=0.154, Calmness=0.143, Amusement=0.135 |
| `机` | `2a0d7a69` | 12.0s | 0.2912 | (105.86, 57.01, -110.96) | Interest=0.141, Calmness=0.136, Amusement=0.131 |
| `村` | `2a0d7a69` | 12.0s | 0.3185 | (81.12, -34.49, -31.91) | Interest=0.170, Calmness=0.152, Amusement=0.138 |
| `歌う` | `2a0d7a69` | 12.0s | 0.3298 | (-66.22, 100.35, -39.08) | Interest=0.166, Calmness=0.156, Excitement=0.143 |
| `死ぬ` | `2a0d7a69` | 12.0s | 0.5563 | (172.51, 54.79, -3.42) | Amusement=0.173, Calmness=0.167, Interest=0.146 |
| `毛皮` | `2a0d7a69` | 12.0s | 0.3190 | (-68.49, 88.73, -43.99) | Interest=0.147, Excitement=0.146, Amusement=0.144 |
| `水` | `2a0d7a69` | 12.0s | 0.2887 | (-74.82, 0.88, -48.76) | Interest=0.168, Calmness=0.148, Amusement=0.137 |
| `注意` | `2a0d7a69` | 12.0s | 0.4545 | (74.96, -26.79, -92.49) | Interest=0.125, Calmness=0.112, Amusement=0.105 |
| `泳ぐ` | `2a0d7a69` | 12.0s | 0.2056 | (71.09, -126.42, -114.72) | Calmness=0.147, Boredom=0.144, Interest=0.139 |
| `洗う` | `2a0d7a69` | 12.0s | 0.2860 | (19.85, 30.37, -38.89) | Interest=0.165, Calmness=0.159, Amusement=0.150 |
| `海` | `2a0d7a69` | 12.0s | 0.8320 | (97.30, 22.49, 23.23) | Pain=0.168, Interest=0.108, Calmness=0.096 |
| `牛` | `2a0d7a69` | 12.0s | 0.3889 | (118.22, -68.16, -94.61) | Calmness=0.133, Boredom=0.120, Amusement=0.114 |
| `狭い` | `2a0d7a69` | 12.0s | 0.4963 | (-26.92, 26.90, -81.93) | Interest=0.123, Excitement=0.112, Calmness=0.097 |
| `病気` | `2a0d7a69` | 12.0s | 0.2467 | (-80.01, -133.28, -105.74) | Calmness=0.124, Interest=0.111, Concentration=0.099 |
| `癖` | `2a0d7a69` | 12.0s | 0.8718 | (172.23, 55.26, 83.68) | Calmness=0.212, Satisfaction=0.198, Excitement=0.177 |
| `白い` | `2a0d7a69` | 12.0s | 0.4110 | (-51.10, -63.07, -27.06) | Interest=0.157, Confusion=0.143, Concentration=0.141 |
| `眠る` | `2a0d7a69` | 12.0s | 0.4849 | (-28.58, -13.47, -79.38) | Interest=0.139, Calmness=0.117, Amusement=0.098 |
| `礼儀` | `2a0d7a69` | 12.0s | 0.3037 | (-69.64, 51.37, -47.02) | Interest=0.174, Calmness=0.143, Amusement=0.135 |
| `祈る` | `2a0d7a69` | 12.0s | 0.3169 | (-68.66, -4.46, -40.02) | Calmness=0.173, Interest=0.163, Boredom=0.161 |
| `空腹` | `2a0d7a69` | 12.0s | 0.2837 | (5.70, 31.43, -42.63) | Calmness=0.163, Interest=0.157, Amusement=0.137 |
| `窓` | `2a0d7a69` | 12.0s | 0.3776 | (-57.88, 136.48, -33.74) | Interest=0.164, Excitement=0.161, Calmness=0.152 |
| `箱` | `2a0d7a69` | 12.0s | 0.5301 | (113.94, -44.34, -57.70) | Interest=0.148, Calmness=0.139, Amusement=0.119 |
| `純粋な` | `2a0d7a69` | 12.0s | 0.3070 | (-68.24, -41.22, -54.87) | Calmness=0.163, Interest=0.151, Boredom=0.145 |
| `結婚` | `2a0d7a69` | 12.0s | 0.2422 | (-80.34, 10.66, -130.16) | Calmness=0.132, Interest=0.121, Amusement=0.103 |
| `緑` | `2a0d7a69` | 12.0s | 0.2714 | (-80.65, 42.19, -48.64) | Interest=0.161, Calmness=0.158, Amusement=0.140 |
| `罪` | `2a0d7a69` | 12.0s | 0.4494 | (-33.54, -43.55, -91.20) | Calmness=0.107, Amusement=0.102, Interest=0.099 |
| `聞く` | `2a0d7a69` | 12.0s | 0.3391 | (-59.82, -42.29, -68.09) | Calmness=0.166, Concentration=0.164, Interest=0.143 |
| `船` | `2a0d7a69` | 12.0s | 0.2791 | (-75.77, -31.07, -49.49) | Interest=0.170, Calmness=0.151, Amusement=0.133 |
| `花` | `2a0d7a69` | 12.0s | 0.3743 | (108.97, 64.50, -29.48) | Interest=0.181, Calmness=0.160, Amusement=0.150 |
| `花嫁` | `2a0d7a69` | 12.0s | 0.3119 | (35.27, 63.04, -43.04) | Amusement=0.158, Calmness=0.157, Interest=0.153 |
| `茎` | `2a0d7a69` | 12.0s | 0.3034 | (53.78, 58.66, -51.84) | Interest=0.167, Calmness=0.165, Amusement=0.142 |
| `荒い` | `2a0d7a69` | 12.0s | 0.4765 | (-29.07, -72.27, -89.80) | Interest=0.097, Calmness=0.094, Amusement=0.085 |
| `落ちる` | `2a0d7a69` | 12.0s | 0.2786 | (-64.68, -59.49, -122.93) | Interest=0.129, Calmness=0.114, Amusement=0.110 |
| `虐める` | `2a0d7a69` | 12.0s | 0.2485 | (-76.63, -54.15, -130.14) | Interest=0.116, Calmness=0.110, Amusement=0.105 |
| `蛙` | `2a0d7a69` | 12.0s | 0.5170 | (-28.20, -86.82, -67.82) | Calmness=0.123, Interest=0.092, Concentration=0.083 |
| `親切な` | `2a0d7a69` | 12.0s | 0.3327 | (-62.69, -65.49, -43.01) | Interest=0.147, Calmness=0.143, Amusement=0.118 |
| `踊る` | `2a0d7a69` | 12.0s | 0.4822 | (-31.21, 41.56, -79.63) | Interest=0.119, Calmness=0.118, Amusement=0.109 |
| `軽蔑` | `2a0d7a69` | 12.0s | 0.4628 | (68.88, 31.76, -85.57) | Calmness=0.112, Interest=0.107, Excitement=0.105 |
| `選ぶ` | `2a0d7a69` | 12.0s | 0.2964 | (-74.66, 35.26, -46.94) | Calmness=0.157, Interest=0.147, Concentration=0.123 |
| `部分` | `2a0d7a69` | 12.0s | 0.5318 | (97.33, -79.06, -66.26) | Calmness=0.125, Interest=0.098, Disappointment=0.090 |
| `金持ち` | `2a0d7a69` | 12.0s | 0.2527 | (-79.67, -149.23, -90.32) | Interest=0.133, Calmness=0.120, Amusement=0.117 |
| `針` | `2a0d7a69` | 12.0s | 0.4912 | (66.36, 139.34, -6.34) | Interest=0.180, Excitement=0.169, Amusement=0.168 |
| `鉛筆` | `2a0d7a69` | 12.0s | 0.4665 | (-31.79, -85.04, -76.54) | Amusement=0.103, Interest=0.100, Calmness=0.093 |
| `長い` | `2a0d7a69` | 12.0s | 0.4530 | (-31.82, -36.65, -90.10) | Interest=0.111, Calmness=0.104, Amusement=0.100 |
| `間違い` | `2a0d7a69` | 12.0s | 0.2027 | (-102.46, 123.85, -104.08) | Interest=0.152, Amusement=0.143, Calmness=0.126 |
| `電気` | `2a0d7a69` | 12.0s | 0.2863 | (-73.57, -3.12, -60.43) | Interest=0.158, Calmness=0.145, Concentration=0.139 |
| `青い` | `2a0d7a69` | 12.0s | 0.4445 | (124.86, -104.67, -14.07) | Interest=0.161, Calmness=0.157, Confusion=0.150 |
| `頭` | `2a0d7a69` | 12.0s | 0.2535 | (-78.32, -155.37, -93.06) | Calmness=0.128, Interest=0.118, Boredom=0.107 |
| `馬鹿` | `2a0d7a69` | 12.0s | 0.3182 | (-55.84, -1.93, -116.64) | Amusement=0.120, Interest=0.112, Calmness=0.108 |
| `高価な` | `2a0d7a69` | 12.0s | 0.3886 | (-54.60, -73.05, -28.40) | Calmness=0.160, Boredom=0.140, Interest=0.139 |
| `鳥` | `2a0d7a69` | 12.0s | 0.3371 | (-64.87, 69.03, -36.82) | Interest=0.160, Calmness=0.153, Amusement=0.151 |
| `黄色` | `2a0d7a69` | 12.0s | 0.3381 | (-55.67, 43.32, -33.57) | Interest=0.178, Amusement=0.172, Calmness=0.170 |
| `お金` | `5346d514` | 12.0s | 0.4095 | (46.59, 81.66, -21.58) | Amusement=0.186, Satisfaction=0.184, Joy=0.172 |
| `かわいい` | `5346d514` | 12.0s | 0.3869 | (-167.68, 59.96, -44.64) | Amusement=0.164, Interest=0.163, Excitement=0.162 |
| `きれいな` | `5346d514` | 12.0s | 0.4569 | (-145.86, -62.73, -54.85) | Calmness=0.182, Interest=0.141, Confusion=0.118 |
| `ご飯` | `5346d514` | 12.0s | 0.6591 | (84.98, -16.37, 43.51) | Amusement=0.248, Joy=0.247, Excitement=0.199 |
| `りんご` | `5346d514` | 12.0s | 0.3709 | (-185.18, -30.42, -55.16) | Amusement=0.133, Interest=0.127, Calmness=0.122 |
| `インク` | `5346d514` | 12.0s | 0.2893 | (-19.26, 71.45, -64.92) | Interest=0.185, Amusement=0.177, Excitement=0.151 |
| `ガラス` | `5346d514` | 12.0s | 0.2679 | (102.96, 21.50, -120.80) | Calmness=0.152, Satisfaction=0.149, Interest=0.146 |
| `キス` | `5346d514` | 12.0s | 0.3430 | (-24.67, 16.53, -36.55) | Amusement=0.182, Joy=0.154, Excitement=0.151 |
| `コウノトリ` | `5346d514` | 12.0s | 0.3842 | (-177.33, -20.45, -54.58) | Interest=0.141, Amusement=0.130, Calmness=0.130 |
| `ドア` | `5346d514` | 12.0s | 0.3133 | (18.86, -50.99, -112.27) | Calmness=0.160, Confusion=0.152, Interest=0.138 |
| `ノート` | `5346d514` | 12.0s | 0.3733 | (115.95, 12.62, -89.08) | Calmness=0.185, Satisfaction=0.161, Interest=0.150 |
| `プライド` | `5346d514` | 12.0s | 0.3673 | (129.58, -11.28, -88.19) | Calmness=0.193, Interest=0.139, Confusion=0.135 |
| `不正` | `5346d514` | 12.0s | 0.3944 | (-175.51, -8.97, -39.95) | Calmness=0.148, Excitement=0.130, Amusement=0.130 |
| `争う` | `5346d514` | 12.0s | 0.3547 | (-3.23, 172.71, -64.41) | Excitement=0.176, Calmness=0.162, Interest=0.156 |
| `亡くなる` | `5346d514` | 12.0s | 0.3512 | (49.92, -49.34, -72.74) | Amusement=0.187, Interest=0.167, Excitement=0.140 |
| `人参` | `5346d514` | 12.0s | 0.3957 | (-170.54, 54.39, -44.09) | Excitement=0.157, Calmness=0.139, Amusement=0.138 |
| `侮辱` | `5346d514` | 12.0s | 0.2634 | (32.90, -19.68, -82.31) | Confusion=0.174, Amusement=0.156, Interest=0.145 |
| `兄弟` | `5346d514` | 12.0s | 0.4224 | (98.67, -32.17, -30.48) | Amusement=0.197, Joy=0.177, Interest=0.165 |
| `冷たい` | `5346d514` | 12.0s | 0.2273 | (22.90, -59.33, -101.46) | Interest=0.164, Calmness=0.149, Confusion=0.148 |
| `別れる` | `5346d514` | 12.0s | 0.1524 | (24.67, -14.11, -124.95) | Interest=0.154, Amusement=0.148, Calmness=0.145 |

## Visualization Contract

Use `manifests/hume-tensor-3d-samples.json` as a graph payload. `nodes[*].initial` is the 3D coordinate. `links[*].distance` is non-voluntary physiological response distance. `nodes[*].alignedWords` contains the aligned stimulus word and total overlap seconds.
