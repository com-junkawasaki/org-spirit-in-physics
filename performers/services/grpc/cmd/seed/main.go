package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
)

type word struct {
	id            int
	japanese      string
	english       string
	pronunciation string
}

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/spirit_in_physics"
	}

	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer conn.Close(context.Background())

	words := []word{
		{1, "頭", "Head", "atama"},
		{2, "緑", "Green", "midori"},
		{3, "水", "Water", "mizu"},
		{4, "歌う", "Sing", "utau"},
		{5, "亡くなる", "Pass away", "nakunaru"},
		{6, "長い", "Long", "nagai"},
		{7, "船", "Ship", "fune"},
		{8, "支払い", "Pay", "shiharai"},
		{9, "窓", "Window", "mado"},
		{10, "親切な", "Kind", "shinsetsu"},
		{11, "机", "Desk", "tsukue"},
		{12, "聞く", "Listen", "kiku"},
		{13, "村", "Village", "mura"},
		{14, "冷たい", "Cold", "tsumetai"},
		{15, "茎", "Stalk", "kuki"},
		{16, "踊る", "Dance", "odoru"},
		{17, "海", "Sea", "umi"},
		{18, "病気", "Sick", "byouki"},
		{19, "プライド", "Pride", "puraido"},
		{20, "料理", "Cook", "ryouri"},
		{21, "インク", "Ink", "inku"},
		{22, "怒り", "Anger", "ikari"},
		{23, "針", "Needle", "hari"},
		{24, "泳ぐ", "Swim", "oyogu"},
		{25, "旅行", "Travel", "ryokou"},
		{26, "青い", "Blue", "aoi"},
		{27, "電気", "Electricity", "denki"},
		{28, "罪", "Sin", "tsumi"},
		{29, "ご飯", "Rice", "gohan"},
		{30, "金持ち", "Rich", "kanemochi"},
		{31, "木", "Tree", "ki"},
		{32, "刺す", "Prick", "sasu"},
		{33, "同情", "Sympathy", "doujou"},
		{34, "黄色", "Yellow", "kiiro"},
		{35, "山", "Mountain", "yama"},
		{36, "死ぬ", "Die", "shinu"},
		{37, "塩", "Salt", "shio"},
		{38, "新しい", "New", "atarashii"},
		{39, "癖", "Habit", "kuse"},
		{40, "祈る", "Pray", "inoru"},
		{41, "お金", "Money", "okane"},
		{42, "馬鹿", "Fool", "baka"},
		{43, "ノート", "Notebook", "no-to"},
		{44, "軽蔑", "Contempt", "keibetsu"},
		{45, "指", "Finger", "yubi"},
		{46, "高価な", "Expensive", "kouka"},
		{47, "鳥", "Bird", "tori"},
		{48, "落ちる", "Fall", "ochiru"},
		{49, "本", "Book", "hon"},
		{50, "不正", "Injustice", "fusei"},
		{51, "蛙", "Frog", "kaeru"},
		{52, "別れる", "Part", "wakareru"},
		{53, "空腹", "Hungry", "kuufuku"},
		{54, "白い", "White", "shiroi"},
		{55, "子供", "Child", "kodomo"},
		{56, "注意", "Attention", "chuui"},
		{57, "鉛筆", "Pencil", "enpitsu"},
		{58, "悲しい", "Sad", "kanashii"},
		{59, "りんご", "Apple", "ringo"},
		{60, "結婚", "Marriage", "kekkon"},
		{61, "家", "Home", "ie"},
		{62, "かわいい", "Cute", "kawaii"},
		{63, "ガラス", "Glass", "garasu"},
		{64, "争う", "Quarrel", "arasou"},
		{65, "毛皮", "Fur", "kegawa"},
		{66, "大きい", "Big", "ookii"},
		{67, "人参", "Carrot", "ninjin"},
		{68, "塗る", "Paint", "nuru"},
		{69, "部分", "Part", "bubun"},
		{70, "古い", "Old", "furui"},
		{71, "花", "Flower", "hana"},
		{72, "打つ", "Hit", "utsu"},
		{73, "箱", "Box", "hako"},
		{74, "荒い", "Rough", "arai"},
		{75, "家族", "Family", "kazoku"},
		{76, "洗う", "Wash", "arau"},
		{77, "牛", "Cow", "ushi"},
		{78, "変", "Strange", "hen"},
		{79, "幸運", "Luck", "kouun"},
		{80, "嘘", "Lie", "uso"},
		{81, "礼儀", "Manners", "reigi"},
		{82, "狭い", "Narrow", "semai"},
		{83, "兄弟", "Brother", "kyoudai"},
		{84, "怖がる", "Afraid", "kowagaru"},
		{85, "コウノトリ", "Stork", "kounotori"},
		{86, "間違い", "Mistake", "machigai"},
		{87, "心配", "Worry", "shinpai"},
		{88, "キス", "Kiss", "kisu"},
		{89, "花嫁", "Bride", "hanayome"},
		{90, "純粋な", "Pure", "junsuina"},
		{91, "ドア", "Door", "doa"},
		{92, "選ぶ", "Choose", "erabu"},
		{93, "干し草", "Hay", "hoshikusa"},
		{94, "嬉しい", "Happy", "ureshii"},
		{95, "虐める", "Abuse", "ijimeru"},
		{96, "眠る", "Sleep", "nemuru"},
		{97, "年月", "Year", "toshitsuki"},
		{98, "きれいな", "Pretty", "kireina"},
		{99, "女", "Woman", "onna"},
		{100, "侮辱", "Insult", "bujoku"},
	}

	for _, w := range words {
		_, err := conn.Exec(context.Background(),
			"INSERT INTO stimulus_words (id, japanese, english, pronunciation) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET japanese = EXCLUDED.japanese, english = EXCLUDED.english, pronunciation = EXCLUDED.pronunciation",
			w.id, w.japanese, w.english, w.pronunciation)
		if err != nil {
			log.Printf("Failed to insert word %d: %v", w.id, err)
		}
	}

	fmt.Println("Successfully seeded 100 stimulus words.")
}
