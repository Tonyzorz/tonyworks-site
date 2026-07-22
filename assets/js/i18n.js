/* Shared Tony Works language selector and lightweight static-site localization. */
(function () {
  "use strict";

  var LANGUAGES = [
    ["en", "English"], ["ko", "한국어"], ["ja", "日本語"],
    ["zh-CN", "简体中文"], ["zh-TW", "繁體中文"], ["de", "Deutsch"],
    ["fr", "Français"], ["es", "Español"], ["pt-BR", "Português (Brasil)"],
    ["ru", "Русский"], ["id", "Bahasa Indonesia"]
  ];
  var CODES = LANGUAGES.map(function (entry) { return entry[0]; });
  var TRANSLATION_ORDER = CODES.slice(1);

  /* Values follow: ko, ja, zh-CN, zh-TW, de, fr, es, pt-BR, ru, id. */
  var PHRASES = {
    "Language": ["언어", "言語", "语言", "語言", "Sprache", "Langue", "Idioma", "Idioma", "Язык", "Bahasa"],
    "Home": ["홈", "ホーム", "首页", "首頁", "Start", "Accueil", "Inicio", "Início", "Главная", "Beranda"],
    "Game": ["게임", "ゲーム", "游戏", "遊戲", "Spiel", "Jeu", "Juego", "Jogo", "Игра", "Game"],
    "Monsters": ["몬스터", "モンスター", "怪物", "怪物", "Monster", "Monstres", "Monstruos", "Monstros", "Монстры", "Monster"],
    "Bosses": ["보스", "ボス", "首领", "首領", "Bosse", "Boss", "Jefes", "Chefes", "Боссы", "Bos"],
    "Items": ["아이템", "アイテム", "物品", "物品", "Gegenstände", "Objets", "Objetos", "Itens", "Предметы", "Item"],
    "Sets": ["세트", "セット", "套装", "套裝", "Sets", "Ensembles", "Conjuntos", "Conjuntos", "Комплекты", "Set"],
    "Maps": ["맵", "マップ", "地图", "地圖", "Karten", "Cartes", "Mapas", "Mapas", "Карты", "Peta"],
    "Characters": ["캐릭터", "キャラクター", "角色", "角色", "Charaktere", "Personnages", "Personajes", "Personagens", "Персонажи", "Karakter"],
    "Achievements": ["업적", "実績", "成就", "成就", "Erfolge", "Succès", "Logros", "Conquistas", "Достижения", "Pencapaian"],
    "Guide": ["가이드", "ガイド", "指南", "指南", "Guide", "Guide", "Guía", "Guia", "Руководство", "Panduan"],
    "Patch Notes": ["패치 노트", "パッチノート", "更新说明", "更新說明", "Patchnotes", "Notes de mise à jour", "Notas del parche", "Notas da atualização", "Примечания к обновлению", "Catatan pembaruan"],
    "FAQ": ["자주 묻는 질문", "よくある質問", "常见问题", "常見問題", "FAQ", "FAQ", "Preguntas frecuentes", "Perguntas frequentes", "Частые вопросы", "Tanya jawab"],
    "Data Notes": ["데이터 안내", "データ説明", "数据说明", "資料說明", "Datenhinweise", "Notes sur les données", "Notas de datos", "Notas de dados", "Примечания к данным", "Catatan data"],
    "About": ["소개", "運営情報", "关于", "關於", "Über uns", "À propos", "Acerca de", "Sobre", "О нас", "Tentang"],
    "More": ["더보기", "その他", "更多", "更多", "Mehr", "Plus", "Más", "Mais", "Ещё", "Lainnya"],
    "Privacy": ["개인정보", "プライバシー", "隐私", "隱私", "Datenschutz", "Confidentialité", "Privacidad", "Privacidade", "Конфиденциальность", "Privasi"],
    "Terms": ["이용약관", "利用規約", "条款", "條款", "Bedingungen", "Conditions", "Términos", "Termos", "Условия", "Ketentuan"],
    "Contact": ["문의", "お問い合わせ", "联系", "聯絡", "Kontakt", "Contact", "Contacto", "Contato", "Связаться", "Kontak"],
    "Toggle light and dark theme": ["라이트/다크 테마 전환", "ライト・ダークテーマを切り替え", "切换浅色和深色主题", "切換淺色和深色主題", "Helles/dunkles Design wechseln", "Changer le thème clair/sombre", "Cambiar tema claro/oscuro", "Alternar tema claro/escuro", "Сменить светлую/тёмную тему", "Ganti tema terang/gelap"],
    "Open navigation menu": ["탐색 메뉴 열기", "ナビゲーションメニューを開く", "打开导航菜单", "開啟導覽選單", "Navigationsmenü öffnen", "Ouvrir le menu de navigation", "Abrir menú de navegación", "Abrir menu de navegação", "Открыть меню навигации", "Buka menu navigasi"],
    "Back to top": ["맨 위로", "ページ上部へ", "返回顶部", "回到頂端", "Nach oben", "Retour en haut", "Volver arriba", "Voltar ao topo", "Наверх", "Kembali ke atas"],
    "Independent game studio": ["인디 게임 스튜디오", "インディーゲームスタジオ", "独立游戏工作室", "獨立遊戲工作室", "Unabhängiges Spielestudio", "Studio de jeux indépendant", "Estudio de juegos independiente", "Estúdio de jogos independente", "Независимая игровая студия", "Studio game independen"],
    "Small worlds.": ["작은 세계.", "小さな世界。", "小小世界。", "小小世界。", "Kleine Welten.", "Petits mondes.", "Mundos pequeños.", "Mundos pequenos.", "Маленькие миры.", "Dunia kecil."],
    "Long adventures.": ["긴 모험.", "長い冒険。", "漫长冒险。", "漫長冒險。", "Große Abenteuer.", "Longues aventures.", "Grandes aventuras.", "Grandes aventuras.", "Долгие приключения.", "Petualangan panjang."],
    "Tony Works creates focused games with deep progression, approachable systems, and player-friendly companion tools.": ["Tony Works는 깊이 있는 성장, 쉬운 시스템, 플레이어 친화적인 도구를 갖춘 집중도 높은 게임을 만듭니다.", "Tony Worksは、奥深い成長、親しみやすいシステム、プレイヤーに優しいツールを備えたゲームを制作しています。", "Tony Works 打造拥有深度成长、易上手系统和玩家友好工具的精品游戏。", "Tony Works 打造具有深度成長、易上手系統與玩家友善工具的精品遊戲。", "Tony Works entwickelt fokussierte Spiele mit tiefem Fortschritt, zugänglichen Systemen und spielerfreundlichen Begleittools.", "Tony Works crée des jeux ciblés avec une progression riche, des systèmes accessibles et des outils utiles aux joueurs.", "Tony Works crea juegos centrados con progresión profunda, sistemas accesibles y herramientas útiles para jugadores.", "A Tony Works cria jogos focados, com progressão profunda, sistemas acessíveis e ferramentas úteis para jogadores.", "Tony Works создаёт продуманные игры с глубокой прогрессией, понятными системами и удобными инструментами для игроков.", "Tony Works membuat game terarah dengan progres mendalam, sistem yang mudah dipahami, dan alat bantu ramah pemain."],
    "Explore Infinite Loot-Loop": ["Infinite Loot-Loop 살펴보기", "Infinite Loot-Loopを見る", "探索 Infinite Loot-Loop", "探索 Infinite Loot-Loop", "Infinite Loot-Loop entdecken", "Découvrir Infinite Loot-Loop", "Explorar Infinite Loot-Loop", "Explorar Infinite Loot-Loop", "Исследовать Infinite Loot-Loop", "Jelajahi Infinite Loot-Loop"],
    "Read the beginner guide": ["초보자 가이드 읽기", "初心者ガイドを読む", "阅读新手指南", "閱讀新手指南", "Einsteigerguide lesen", "Lire le guide débutant", "Leer la guía para principiantes", "Ler o guia para iniciantes", "Читать руководство новичка", "Baca panduan pemula"],
    "In development": ["개발 중", "開発中", "开发中", "開發中", "In Entwicklung", "En développement", "En desarrollo", "Em desenvolvimento", "В разработке", "Dalam pengembangan"],
    "Featured game": ["대표 게임", "注目のゲーム", "精选游戏", "精選遊戲", "Vorgestelltes Spiel", "Jeu à la une", "Juego destacado", "Jogo em destaque", "Избранная игра", "Game unggulan"],
    "Mobile roguelike RPG": ["모바일 로그라이크 RPG", "モバイルローグライクRPG", "移动端肉鸽 RPG", "行動裝置 Roguelike RPG", "Mobiles Roguelike-RPG", "RPG roguelike mobile", "RPG roguelike para móvil", "RPG roguelike mobile", "Мобильная roguelike-RPG", "RPG roguelike mobile"],
    "Built for mobile": ["모바일에 최적화", "モバイル向け", "专为移动端打造", "專為行動裝置打造", "Für Mobilgeräte", "Conçu pour mobile", "Diseñado para móvil", "Feito para mobile", "Для мобильных устройств", "Dibuat untuk mobile"],
    "Supported languages": ["지원 언어", "対応言語", "支持语言", "支援語言", "Unterstützte Sprachen", "Langues disponibles", "Idiomas disponibles", "Idiomas disponíveis", "Поддерживаемые языки", "Bahasa tersedia"],
    "Data-backed wiki": ["게임 데이터 기반 위키", "ゲームデータ連携Wiki", "游戏数据驱动的百科", "遊戲資料驅動的百科", "Datengestütztes Wiki", "Wiki alimenté par les données", "Wiki basado en datos", "Wiki baseado em dados", "Вики на основе игровых данных", "Wiki berbasis data"],
    "More than a landing page": ["단순한 소개 페이지 그 이상", "ランディングページ以上の価値", "不只是宣传页面", "不只是宣傳頁面", "Mehr als eine Landingpage", "Bien plus qu'une page d'accueil", "Más que una página de inicio", "Mais que uma página inicial", "Больше, чем главная страница", "Lebih dari halaman utama"],
    "Everything for your next run": ["다음 플레이에 필요한 모든 것", "次のランに必要なすべて", "下一轮冒险所需的一切", "下一輪冒險所需的一切", "Alles für deinen nächsten Lauf", "Tout pour votre prochaine partie", "Todo para tu próxima partida", "Tudo para sua próxima partida", "Всё для следующего забега", "Semua untuk perjalanan berikutnya"],
    "The official companion wiki stays connected to the game data, so planning a build never becomes guesswork.": ["공식 동반 위키가 게임 데이터와 연결되어 있어 빌드를 정확하게 계획할 수 있습니다.", "公式Wikiはゲームデータと連携しているため、ビルドを正確に計画できます。", "官方伴侣百科与游戏数据保持同步，让配装规划不再靠猜。", "官方夥伴百科與遊戲資料保持同步，讓配裝規劃不再靠猜。", "Das offizielle Begleit-Wiki ist mit den Spieldaten verbunden, damit du Builds zuverlässig planen kannst.", "Le wiki compagnon officiel reste lié aux données du jeu pour planifier vos builds avec précision.", "La wiki oficial se conecta a los datos del juego para que puedas planear tus builds con precisión.", "A wiki oficial acompanha os dados do jogo para você planejar builds com precisão.", "Официальная вики связана с игровыми данными, поэтому сборку можно планировать точно.", "Wiki resmi terhubung dengan data game agar perencanaan build selalu akurat."],
    "Explore the wiki": ["위키 살펴보기", "Wikiを見る", "探索百科", "探索百科", "Wiki entdecken", "Explorer le wiki", "Explorar la wiki", "Explorar a wiki", "Открыть вики", "Jelajahi wiki"],
    "Monsters, bosses, items, maps and characters": ["몬스터, 보스, 아이템, 맵, 캐릭터", "モンスター、ボス、アイテム、マップ、キャラクター", "怪物、首领、物品、地图和角色", "怪物、首領、物品、地圖與角色", "Monster, Bosse, Gegenstände, Karten und Charaktere", "Monstres, boss, objets, cartes et personnages", "Monstruos, jefes, objetos, mapas y personajes", "Monstros, chefes, itens, mapas e personagens", "Монстры, боссы, предметы, карты и персонажи", "Monster, bos, item, peta, dan karakter"],
    "Learn the loop": ["게임 흐름 배우기", "ループを学ぶ", "了解循环玩法", "了解循環玩法", "Spielschleife verstehen", "Comprendre la boucle", "Aprender el ciclo", "Entender o ciclo", "Изучить игровой цикл", "Pelajari siklus permainan"],
    "A friendly guide from first battle to Hard Mode": ["첫 전투부터 하드 모드까지 친절한 가이드", "初戦からハードモードまでのやさしいガイド", "从首战到困难模式的友好指南", "從首戰到困難模式的友善指南", "Ein verständlicher Guide vom ersten Kampf bis zum Hard Mode", "Un guide simple du premier combat au mode difficile", "Una guía amigable desde la primera batalla hasta el modo difícil", "Um guia amigável da primeira batalha ao modo difícil", "Понятное руководство от первого боя до сложного режима", "Panduan ramah dari pertarungan pertama hingga Mode Sulit"],
    "Follow development": ["개발 소식 보기", "開発をフォロー", "关注开发进展", "關注開發進度", "Entwicklung verfolgen", "Suivre le développement", "Seguir el desarrollo", "Acompanhar o desenvolvimento", "Следить за разработкой", "Ikuti pengembangan"],
    "New content, balance changes and fixes": ["신규 콘텐츠, 밸런스 변경, 수정 사항", "新コンテンツ、バランス調整、修正", "新内容、平衡调整和修复", "新內容、平衡調整與修正", "Neue Inhalte, Balance-Änderungen und Fehlerbehebungen", "Nouveau contenu, équilibrage et corrections", "Contenido nuevo, cambios de equilibrio y correcciones", "Novos conteúdos, ajustes de balanceamento e correções", "Новый контент, изменения баланса и исправления", "Konten baru, perubahan keseimbangan, dan perbaikan"],
    "Games made with care—and supported after launch.": ["정성껏 만들고 출시 후에도 꾸준히 지원하는 게임.", "丁寧に作り、リリース後も支え続けるゲーム。", "用心制作，并在上线后持续维护。", "用心製作，並在推出後持續維護。", "Mit Sorgfalt entwickelt und auch nach dem Start unterstützt.", "Des jeux conçus avec soin et suivis après leur sortie.", "Juegos creados con cuidado y respaldados tras el lanzamiento.", "Jogos feitos com carinho e apoiados após o lançamento.", "Игры, созданные с заботой и поддерживаемые после запуска.", "Game yang dibuat dengan teliti dan terus didukung setelah rilis."],
    "Get in touch": ["문의하기", "お問い合わせ", "联系我们", "聯絡我們", "Kontakt aufnehmen", "Nous contacter", "Contactar", "Entre em contato", "Связаться", "Hubungi kami"],
    "Official companion wiki": ["공식 동반 위키", "公式コンパニオンWiki", "官方伴侣百科", "官方夥伴百科", "Offizielles Begleit-Wiki", "Wiki compagnon officiel", "Wiki oficial complementaria", "Wiki oficial complementar", "Официальная вики-помощник", "Wiki pendamping resmi"],
    "Find drops, explore routes, compare gear and plan your next run with data exported directly from the game.": ["게임에서 직접 내보낸 데이터로 드롭을 찾고, 경로와 장비를 비교해 다음 플레이를 계획하세요.", "ゲームから直接出力されたデータでドロップ、ルート、装備を確認し、次のランを計画しましょう。", "使用游戏直接导出的数据查找掉落、探索路线、比较装备并规划下一轮冒险。", "使用遊戲直接匯出的資料查找掉落、探索路線、比較裝備並規劃下一輪冒險。", "Finde Beute, erkunde Routen, vergleiche Ausrüstung und plane deinen nächsten Lauf mit direkt exportierten Spieldaten.", "Trouvez le butin, explorez les routes, comparez l'équipement et préparez votre prochaine partie avec les données du jeu.", "Busca botín, explora rutas, compara equipo y planea tu próxima partida con datos exportados del juego.", "Encontre saques, explore rotas, compare equipamentos e planeje a próxima partida com dados do jogo.", "Ищите добычу, изучайте маршруты, сравнивайте снаряжение и планируйте забег по данным из игры.", "Temukan loot, jelajahi rute, bandingkan perlengkapan, dan rencanakan perjalanan dengan data langsung dari game."],
    "Start with the guide": ["가이드로 시작하기", "ガイドから始める", "从指南开始", "從指南開始", "Mit dem Guide starten", "Commencer par le guide", "Empezar con la guía", "Começar pelo guia", "Начать с руководства", "Mulai dengan panduan"],
    "Mobile launch:": ["모바일 출시:", "モバイル版:", "移动版上线：", "行動版推出：", "Mobile-Start:", "Sortie mobile :", "Lanzamiento móvil:", "Lançamento mobile:", "Мобильный релиз:", "Peluncuran mobile:"],
    "iOS & Android coming soon": ["iOS 및 Android 출시 예정", "iOS・Android版近日公開", "iOS 与 Android 即将上线", "iOS 與 Android 即將推出", "iOS & Android folgen bald", "iOS et Android bientôt disponibles", "iOS y Android próximamente", "iOS e Android em breve", "Скоро на iOS и Android", "iOS & Android segera hadir"],
    "Quick lookup": ["빠른 검색", "クイック検索", "快速查询", "快速查詢", "Schnellsuche", "Recherche rapide", "Búsqueda rápida", "Busca rápida", "Быстрый поиск", "Pencarian cepat"],
    "What are you looking for?": ["무엇을 찾고 있나요?", "何をお探しですか？", "你在找什么？", "你在找什麼？", "Wonach suchst du?", "Que recherchez-vous ?", "¿Qué estás buscando?", "O que você procura?", "Что вы ищете?", "Apa yang Anda cari?"],
    "Jump straight to a monster, boss, item or character.": ["몬스터, 보스, 아이템 또는 캐릭터로 바로 이동하세요.", "モンスター、ボス、アイテム、キャラクターへ直接移動できます。", "直接前往怪物、首领、物品或角色页面。", "直接前往怪物、首領、物品或角色頁面。", "Springe direkt zu einem Monster, Boss, Gegenstand oder Charakter.", "Accédez directement à un monstre, un boss, un objet ou un personnage.", "Ve directamente a un monstruo, jefe, objeto o personaje.", "Vá direto para um monstro, chefe, item ou personagem.", "Сразу переходите к монстру, боссу, предмету или персонажу.", "Langsung buka monster, bos, item, atau karakter."],
    "New to Infinite Loot-Loop?": ["Infinite Loot-Loop가 처음인가요?", "Infinite Loot-Loopは初めてですか？", "第一次玩 Infinite Loot-Loop？", "第一次玩 Infinite Loot-Loop？", "Neu bei Infinite Loot-Loop?", "Vous débutez dans Infinite Loot-Loop ?", "¿Eres nuevo en Infinite Loot-Loop?", "Novo em Infinite Loot-Loop?", "Впервые в Infinite Loot-Loop?", "Baru di Infinite Loot-Loop?"],
    "Learn the essentials, choose your playstyle and enter your first route with a plan.": ["핵심을 배우고 플레이 스타일을 선택한 뒤 계획을 세워 첫 경로에 도전하세요.", "基本を学び、プレイスタイルを選び、計画を立てて最初のルートへ進みましょう。", "掌握要点、选择玩法，并有计划地踏上第一条路线。", "掌握要點、選擇玩法，並有計畫地踏上第一條路線。", "Lerne die Grundlagen, wähle deinen Spielstil und starte deine erste Route mit einem Plan.", "Apprenez l'essentiel, choisissez votre style et commencez votre première route avec un plan.", "Aprende lo esencial, elige tu estilo y entra en tu primera ruta con un plan.", "Aprenda o essencial, escolha seu estilo e comece a primeira rota com um plano.", "Изучите основы, выберите стиль и продумайте первый маршрут.", "Pelajari dasar-dasarnya, pilih gaya bermain, dan mulai rute pertama dengan rencana."],
    "Mobile roguelike RPG — endless loops of monsters, loot and bosses.": ["몬스터, 전리품, 보스가 끝없이 이어지는 모바일 로그라이크 RPG.", "モンスター、戦利品、ボスが無限に続くモバイルローグライクRPG。", "怪物、战利品与首领不断循环的移动端肉鸽 RPG。", "怪物、戰利品與首領不斷循環的行動版 Roguelike RPG。", "Mobiles Roguelike-RPG mit endlosen Schleifen aus Monstern, Beute und Bossen.", "RPG roguelike mobile aux boucles infinies de monstres, butin et boss.", "RPG roguelike para móvil con ciclos infinitos de monstruos, botín y jefes.", "RPG roguelike mobile com ciclos infinitos de monstros, saques e chefes.", "Мобильная roguelike-RPG с бесконечными циклами монстров, добычи и боссов.", "RPG roguelike mobile dengan siklus monster, loot, dan bos tanpa akhir."],
    "Stats, locations and drop tables": ["능력치, 출현 지역, 드롭 표", "ステータス、出現場所、ドロップ表", "属性、位置和掉落表", "屬性、位置與掉落表", "Werte, Fundorte und Beutetabellen", "Stats, lieux et tables de butin", "Estadísticas, ubicaciones y tablas de botín", "Atributos, locais e tabelas de saque", "Характеристики, места и таблицы добычи", "Stat, lokasi, dan tabel drop"],
    "Normal and Hard Mode rewards": ["일반 및 하드 모드 보상", "ノーマル・ハードモード報酬", "普通与困难模式奖励", "普通與困難模式獎勵", "Belohnungen im Normal- und Hard-Modus", "Récompenses des modes normal et difficile", "Recompensas de los modos normal y difícil", "Recompensas dos modos normal e difícil", "Награды обычного и сложного режимов", "Hadiah Mode Normal dan Sulit"],
    "Gear, effects and rarity": ["장비, 효과, 희귀도", "装備、効果、レア度", "装备、效果和稀有度", "裝備、效果與稀有度", "Ausrüstung, Effekte und Seltenheit", "Équipement, effets et rareté", "Equipo, efectos y rareza", "Equipamentos, efeitos e raridade", "Снаряжение, эффекты и редкость", "Perlengkapan, efek, dan kelangkaan"],
    "World connections and routes": ["월드 연결과 경로", "ワールド接続とルート", "世界连接与路线", "世界連接與路線", "Weltverbindungen und Routen", "Connexions et routes du monde", "Conexiones y rutas del mundo", "Conexões e rotas do mundo", "Связи миров и маршруты", "Koneksi dunia dan rute"],
    "Roster and stat multipliers": ["캐릭터 목록과 능력치 배율", "キャラクター一覧とステータス倍率", "角色阵容与属性倍率", "角色陣容與屬性倍率", "Charakterliste und Werte-Multiplikatoren", "Effectif et multiplicateurs de stats", "Plantilla y multiplicadores de estadísticas", "Elenco e multiplicadores de atributos", "Состав и множители характеристик", "Daftar karakter dan pengali stat"],
    "Field Guide": ["필드 가이드", "フィールドガイド", "冒险指南", "冒險指南", "Feldguide", "Guide de terrain", "Guía de campo", "Guia de campo", "Полевое руководство", "Panduan lapangan"],
    "Progression, stats and strategy": ["성장, 능력치, 전략", "進行、ステータス、戦略", "成长、属性与策略", "成長、屬性與策略", "Fortschritt, Werte und Strategie", "Progression, stats et stratégie", "Progresión, estadísticas y estrategia", "Progressão, atributos e estratégia", "Прогресс, характеристики и стратегия", "Progres, stat, dan strategi"],
    "Item Sets": ["아이템 세트", "アイテムセット", "物品套装", "物品套裝", "Gegenstandssets", "Ensembles d'objets", "Conjuntos de objetos", "Conjuntos de itens", "Комплекты предметов", "Set item"],
    "Build complete equipment bonuses": ["완성 장비 세트 보너스 구성", "装備セットボーナスを完成させる", "组合完整的装备套装加成", "組合完整的裝備套裝加成", "Vollständige Ausrüstungsboni zusammenstellen", "Composer des bonus d'équipement complets", "Completa bonificaciones de conjuntos", "Monte bônus completos de equipamento", "Соберите полные бонусы экипировки", "Susun bonus perlengkapan lengkap"],
    "Track goals and permanent rewards": ["목표와 영구 보상 추적", "目標と永続報酬を確認", "追踪目标和永久奖励", "追蹤目標與永久獎勵", "Ziele und permanente Belohnungen verfolgen", "Suivre les objectifs et récompenses permanentes", "Seguir objetivos y recompensas permanentes", "Acompanhar metas e recompensas permanentes", "Отслеживать цели и постоянные награды", "Lacak target dan hadiah permanen"],
    "See the latest changes": ["최신 변경 사항 보기", "最新の変更を見る", "查看最新改动", "查看最新變更", "Neueste Änderungen ansehen", "Voir les dernières modifications", "Ver los últimos cambios", "Ver as alterações mais recentes", "Посмотреть последние изменения", "Lihat perubahan terbaru"],
    "Get quick player answers": ["플레이 질문의 빠른 답변", "プレイヤー向け回答をすぐ確認", "快速获取玩家问题答案", "快速取得玩家問題解答", "Schnelle Antworten für Spieler", "Obtenir des réponses rapides", "Obtener respuestas rápidas", "Obter respostas rápidas", "Быстрые ответы для игроков", "Dapatkan jawaban cepat"],
    "First run": ["첫 플레이", "最初のラン", "初次冒险", "初次冒險", "Erster Lauf", "Première partie", "Primera partida", "Primeira partida", "Первый забег", "Perjalanan pertama"],
    "AP, battles, death and permanent progress": ["AP, 전투, 패배, 영구 성장", "AP、バトル、敗北、永続進行", "AP、战斗、失败与永久成长", "AP、戰鬥、失敗與永久成長", "AP, Kämpfe, Niederlagen und permanenter Fortschritt", "PA, combats, défaite et progression permanente", "PA, combates, derrota y progreso permanente", "PA, batalhas, derrota e progresso permanente", "очки приключений, бои, поражение и постоянный прогресс", "AP, pertempuran, kekalahan, dan progres permanen"],
    "Compare starters and stat multipliers": ["기본 캐릭터와 능력치 배율 비교", "初期キャラとステータス倍率を比較", "比较初始角色和属性倍率", "比較初始角色與屬性倍率", "Starter und Werte-Multiplikatoren vergleichen", "Comparer les personnages de départ et leurs stats", "Comparar iniciales y multiplicadores", "Comparar personagens iniciais e multiplicadores", "Сравнить стартовых персонажей и множители", "Bandingkan karakter awal dan pengali stat"],
    "Stats, rarity, drops and equipment sets": ["능력치, 희귀도, 드롭, 장비 세트", "ステータス、レア度、ドロップ、装備セット", "属性、稀有度、掉落与装备套装", "屬性、稀有度、掉落與裝備套裝", "Werte, Seltenheit, Beute und Ausrüstungssets", "Stats, rareté, butin et ensembles", "Estadísticas, rareza, botín y conjuntos", "Atributos, raridade, saques e conjuntos", "Характеристики, редкость, добыча и комплекты", "Stat, kelangkaan, drop, dan set perlengkapan"],
    "World connections, zones and bosses": ["월드 연결, 구역, 보스", "ワールド接続、ゾーン、ボス", "世界连接、区域与首领", "世界連接、區域與首領", "Weltverbindungen, Zonen und Bosse", "Connexions, zones et boss", "Conexiones, zonas y jefes", "Conexões, zonas e chefes", "Связи миров, зоны и боссы", "Koneksi dunia, zona, dan bos"],
    "Keep exploring": ["계속 살펴보기", "さらに見る", "继续探索", "繼續探索", "Weiter entdecken", "Continuer l'exploration", "Seguir explorando", "Continuar explorando", "Продолжить изучение", "Lanjut jelajahi"],
    "Current game build": ["현재 게임 빌드", "現在のゲームビルド", "当前游戏版本", "目前遊戲版本", "Aktueller Spiel-Build", "Version actuelle du jeu", "Versión actual del juego", "Versão atual do jogo", "Текущая сборка игры", "Build game saat ini"],
    "Development": ["개발 버전", "開発版", "开发版本", "開發版本", "Entwicklung", "Développement", "Desarrollo", "Desenvolvimento", "Разработка", "Pengembangan"],
    "Wiki refreshed": ["위키 갱신", "Wiki更新日", "百科更新时间", "百科更新時間", "Wiki aktualisiert", "Wiki actualisé", "Wiki actualizada", "Wiki atualizada", "Вики обновлена", "Wiki diperbarui"],
    "Mobile release": ["모바일 출시", "モバイル版リリース", "移动版发布", "行動版發布", "Mobile-Veröffentlichung", "Sortie mobile", "Lanzamiento móvil", "Lançamento mobile", "Мобильный релиз", "Rilis mobile"],
    "Read latest patch notes": ["최신 패치 노트 읽기", "最新パッチノートを読む", "阅读最新更新说明", "閱讀最新更新說明", "Neueste Patchnotes lesen", "Lire les dernières notes", "Leer las últimas notas", "Ler as últimas notas", "Читать последние изменения", "Baca catatan terbaru"],
    "Not available": ["정보 없음", "利用できません", "暂无信息", "暫無資訊", "Nicht verfügbar", "Indisponible", "No disponible", "Indisponível", "Недоступно", "Tidak tersedia"],
    "Choose a character": ["캐릭터 선택", "キャラクターを選ぶ", "选择角色", "選擇角色", "Charakter wählen", "Choisir un personnage", "Elegir un personaje", "Escolher um personagem", "Выбрать персонажа", "Pilih karakter"],
    "Understand gear": ["장비 이해하기", "装備を理解する", "了解装备", "了解裝備", "Ausrüstung verstehen", "Comprendre l'équipement", "Entender el equipo", "Entender os equipamentos", "Разобраться в снаряжении", "Pahami perlengkapan"],
    "Plan your route": ["경로 계획하기", "ルートを計画する", "规划路线", "規劃路線", "Route planen", "Planifier votre route", "Planear tu ruta", "Planejar sua rota", "Спланировать маршрут", "Rencanakan rute"],
    "Game database": ["게임 데이터베이스", "ゲームデータベース", "游戏数据库", "遊戲資料庫", "Spieldatenbank", "Base de données du jeu", "Base de datos del juego", "Banco de dados do jogo", "База данных игры", "Database game"],
    "More resources": ["추가 자료", "その他の資料", "更多资源", "更多資源", "Weitere Ressourcen", "Plus de ressources", "Más recursos", "Mais recursos", "Другие материалы", "Sumber lainnya"],
    "Search the wiki": ["위키 검색", "Wikiを検索", "搜索百科", "搜尋百科", "Wiki durchsuchen", "Rechercher dans le wiki", "Buscar en la wiki", "Buscar na wiki", "Поиск по вики", "Cari di wiki"],
    "Loading game data…": ["게임 데이터 불러오는 중…", "ゲームデータを読み込み中…", "正在加载游戏数据…", "正在載入遊戲資料…", "Spieldaten werden geladen…", "Chargement des données du jeu…", "Cargando datos del juego…", "Carregando dados do jogo…", "Загрузка игровых данных…", "Memuat data game…"],
    "No matches.": ["검색 결과가 없습니다.", "一致する結果はありません。", "没有匹配结果。", "沒有符合結果。", "Keine Treffer.", "Aucun résultat.", "Sin resultados.", "Nenhum resultado.", "Совпадений нет.", "Tidak ada hasil."],
    "Translation status": ["번역 안내", "翻訳について", "翻译状态", "翻譯狀態", "Übersetzungsstatus", "État de la traduction", "Estado de traducción", "Status da tradução", "Статус перевода", "Status terjemahan"],
    "Navigation and game database names are available in your language. This detailed article is currently shown in English.": ["탐색 메뉴와 게임 데이터베이스 이름은 선택한 언어로 제공됩니다. 이 상세 문서는 현재 영어로 표시됩니다.", "ナビゲーションとゲームデータベース名は選択した言語で表示されます。この記事の詳細は現在英語です。", "导航和游戏数据库名称已支持你的语言。此详细文章目前以英文显示。", "導覽與遊戲資料庫名稱已支援你的語言。此詳細文章目前以英文顯示。", "Navigation und Namen der Spieldatenbank sind in deiner Sprache verfügbar. Dieser ausführliche Artikel wird derzeit auf Englisch angezeigt.", "La navigation et les noms de la base de données sont disponibles dans votre langue. Cet article détaillé est actuellement affiché en anglais.", "La navegación y los nombres de la base de datos están disponibles en tu idioma. Este artículo detallado se muestra actualmente en inglés.", "A navegação e os nomes do banco de dados estão disponíveis no seu idioma. Este artigo detalhado está em inglês no momento.", "Навигация и названия в игровой базе доступны на вашем языке. Подробная статья пока отображается на английском.", "Navigasi dan nama database game tersedia dalam bahasa Anda. Artikel terperinci ini saat ini ditampilkan dalam bahasa Inggris."],
    "Page controls and headings are available in your language. This legal document is currently shown in English.": ["페이지 조작 요소와 제목은 선택한 언어로 제공됩니다. 이 법률 문서는 현재 영어로 표시됩니다.", "ページ操作と見出しは選択した言語で表示されます。この法的文書は現在英語です。", "页面控件和标题已支持你的语言。此法律文件目前以英文显示。", "頁面控制項與標題已支援你的語言。此法律文件目前以英文顯示。", "Seitenelemente und Überschriften sind in deiner Sprache verfügbar. Dieses Rechtsdokument wird derzeit auf Englisch angezeigt.", "Les commandes et titres sont disponibles dans votre langue. Ce document juridique est actuellement affiché en anglais.", "Los controles y títulos están disponibles en tu idioma. Este documento legal se muestra actualmente en inglés.", "Os controles e títulos estão disponíveis no seu idioma. Este documento jurídico está em inglês no momento.", "Элементы управления и заголовки доступны на вашем языке. Юридический документ пока отображается на английском.", "Kontrol halaman dan judul tersedia dalam bahasa Anda. Dokumen hukum ini saat ini ditampilkan dalam bahasa Inggris."],
    "Search": ["검색", "検索", "搜索", "搜尋", "Suchen", "Rechercher", "Buscar", "Buscar", "Поиск", "Cari"],
    "All": ["전체", "すべて", "全部", "全部", "Alle", "Tous", "Todos", "Todos", "Все", "Semua"],
    "Normal": ["일반", "ノーマル", "普通", "普通", "Normal", "Normal", "Normal", "Normal", "Обычный", "Normal"],
    "Hard": ["하드", "ハード", "困难", "困難", "Schwer", "Difficile", "Difícil", "Difícil", "Сложный", "Sulit"],
    "entries": ["개 항목", "件", "条", "筆", "Einträge", "entrées", "entradas", "entradas", "записей", "entri"],
    "Mode": ["모드", "モード", "模式", "模式", "Modus", "Mode", "Modo", "Modo", "Режим", "Mode"],
    "Rarity": ["희귀도", "レア度", "稀有度", "稀有度", "Seltenheit", "Rareté", "Rareza", "Raridade", "Редкость", "Kelangkaan"],
    "Area": ["지역", "エリア", "区域", "地區", "Gebiet", "Zone", "Área", "Área", "Область", "Area"],
    "Sort": ["정렬", "並べ替え", "排序", "排序", "Sortieren", "Trier", "Ordenar", "Ordenar", "Сортировка", "Urutkan"],
    "Main stat": ["주요 능력치", "メインステータス", "主属性", "主屬性", "Hauptwert", "Stat principale", "Atributo principal", "Atributo principal", "Основной параметр", "Stat utama"],
    "Low to high": ["낮은 순", "低い順", "从低到高", "由低至高", "Aufsteigend", "Croissant", "De menor a mayor", "Do menor para o maior", "По возрастанию", "Terendah ke tertinggi"],
    "High to low": ["높은 순", "高い順", "从高到低", "由高至低", "Absteigend", "Décroissant", "De mayor a menor", "Do maior para o menor", "По убыванию", "Tertinggi ke terendah"],
    "Weapon": ["무기", "武器", "武器", "武器", "Waffe", "Arme", "Arma", "Arma", "Оружие", "Senjata"],
    "Armor": ["방어구", "防具", "护甲", "護甲", "Rüstung", "Armure", "Armadura", "Armadura", "Броня", "Zirah"],
    "Helmet": ["투구", "兜", "头盔", "頭盔", "Helm", "Casque", "Casco", "Elmo", "Шлем", "Helm"],
    "Shoes": ["신발", "靴", "鞋子", "鞋子", "Schuhe", "Chaussures", "Calzado", "Calçados", "Обувь", "Sepatu"],
    "Accessory": ["장신구", "アクセサリー", "饰品", "飾品", "Accessoire", "Accessoire", "Accesorio", "Acessório", "Аксессуар", "Aksesori"],
    "Common": ["일반", "コモン", "普通", "普通", "Gewöhnlich", "Commun", "Común", "Comum", "Обычный", "Umum"],
    "Uncommon": ["고급", "アンコモン", "优秀", "優秀", "Ungewöhnlich", "Inhabituel", "Poco común", "Incomum", "Необычный", "Tidak umum"],
    "Rare": ["희귀", "レア", "稀有", "稀有", "Selten", "Rare", "Raro", "Raro", "Редкий", "Langka"],
    "Epic": ["영웅", "エピック", "史诗", "史詩", "Episch", "Épique", "Épico", "Épico", "Эпический", "Epik"],
    "Legendary": ["전설", "レジェンダリー", "传说", "傳說", "Legendär", "Légendaire", "Legendario", "Lendário", "Легендарный", "Legendaris"],
    "Bestiary": ["몬스터 도감", "モンスター図鑑", "怪物图鉴", "怪物圖鑑", "Bestiarium", "Bestiaire", "Bestiario", "Bestiário", "Бестиарий", "Bestiari"],
    "Boss Archive": ["보스 기록", "ボス図鑑", "首领档案", "首領檔案", "Bossarchiv", "Archives des boss", "Archivo de jefes", "Arquivo de chefes", "Архив боссов", "Arsip bos"],
    "Loot Library": ["전리품 도감", "戦利品図鑑", "战利品图鉴", "戰利品圖鑑", "Beutearchiv", "Bibliothèque du butin", "Biblioteca de botín", "Biblioteca de saques", "Архив добычи", "Pustaka loot"],
    "Build Workshop": ["빌드 연구소", "ビルド工房", "配装工坊", "配裝工坊", "Build-Werkstatt", "Atelier de builds", "Taller de builds", "Oficina de builds", "Мастерская сборок", "Lokakarya build"],
    "World Atlas": ["세계 지도책", "ワールドアトラス", "世界图鉴", "世界圖鑑", "Weltatlas", "Atlas du monde", "Atlas mundial", "Atlas mundial", "Атлас мира", "Atlas dunia"],
    "Roster": ["캐릭터 명단", "キャラクター一覧", "角色名单", "角色名單", "Charakterliste", "Effectif", "Plantilla", "Elenco", "Список героев", "Daftar karakter"],
    "Milestones": ["주요 업적", "マイルストーン", "里程碑", "里程碑", "Meilensteine", "Jalons", "Hitos", "Marcos", "Вехи", "Tonggak"],
    "Wiki navigation": ["위키 탐색", "Wikiナビゲーション", "百科导航", "百科導覽", "Wiki-Navigation", "Navigation du wiki", "Navegación de la wiki", "Navegação da wiki", "Навигация по вики", "Navigasi wiki"],
    "Prev": ["이전", "前へ", "上一项", "上一項", "Zurück", "Précédent", "Anterior", "Anterior", "Назад", "Sebelumnya"],
    "Next": ["다음", "次へ", "下一项", "下一項", "Weiter", "Suivant", "Siguiente", "Próximo", "Далее", "Berikutnya"],
    "Zone": ["구역", "ゾーン", "区域", "區域", "Zone", "Zone", "Zona", "Zona", "Зона", "Zona"],
    "Privacy Policy": ["개인정보 처리방침", "プライバシーポリシー", "隐私政策", "隱私權政策", "Datenschutzerklärung", "Politique de confidentialité", "Política de privacidad", "Política de privacidade", "Политика конфиденциальности", "Kebijakan Privasi"],
    "Terms of Service": ["이용약관", "利用規約", "服务条款", "服務條款", "Nutzungsbedingungen", "Conditions d'utilisation", "Términos del servicio", "Termos de Serviço", "Условия использования", "Ketentuan Layanan"],
    "Data Deletion Request": ["데이터 삭제 요청", "データ削除リクエスト", "数据删除请求", "資料刪除要求", "Antrag auf Datenlöschung", "Demande de suppression des données", "Solicitud de eliminación de datos", "Solicitação de exclusão de dados", "Запрос на удаление данных", "Permintaan Penghapusan Data"],
    "Data Deletion": ["데이터 삭제", "データ削除", "数据删除", "資料刪除", "Datenlöschung", "Suppression des données", "Eliminación de datos", "Exclusão de dados", "Удаление данных", "Penghapusan Data"],
    "Last updated": ["최종 업데이트", "最終更新", "最后更新", "最後更新", "Zuletzt aktualisiert", "Dernière mise à jour", "Última actualización", "Última atualização", "Последнее обновление", "Terakhir diperbarui"]
  };

  function canonicalLanguage(value) {
    var raw = String(value || "").trim().replace(/_/g, "-");
    var lower = raw.toLowerCase();
    if (lower === "zh" || lower === "zh-hans" || lower.indexOf("zh-cn") === 0 || lower.indexOf("zh-sg") === 0) return "zh-CN";
    if (lower === "zh-hant" || lower.indexOf("zh-tw") === 0 || lower.indexOf("zh-hk") === 0 || lower.indexOf("zh-mo") === 0) return "zh-TW";
    if (lower.indexOf("pt") === 0) return "pt-BR";
    for (var i = 0; i < CODES.length; i++) {
      if (lower === CODES[i].toLowerCase() || lower.split("-")[0] === CODES[i].toLowerCase()) return CODES[i];
    }
    return "";
  }

  function preferredLanguage() {
    var query = "";
    try { query = new URLSearchParams(window.location.search).get("lang") || ""; } catch (e) {}
    var selected = canonicalLanguage(query);
    if (selected) return selected;
    try { selected = canonicalLanguage(localStorage.getItem("tw-lang")); } catch (e) {}
    if (selected) return selected;
    var choices = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < choices.length; i++) {
      selected = canonicalLanguage(choices[i]);
      if (selected) return selected;
    }
    return "en";
  }

  var code = preferredLanguage();
  document.documentElement.lang = code;
  try { localStorage.setItem("tw-lang", code); } catch (e) {}

  var siteMap = {};
  var siteMapLower = {};
  Object.keys(PHRASES).forEach(function (english) {
    var translated = PHRASES[english][TRANSLATION_ORDER.indexOf(code)];
    if (code !== "en" && translated) {
      siteMap[english] = translated;
      siteMapLower[english.toLowerCase()] = translated;
    }
  });
  var gameMap = {};
  var gameMapLower = {};
  var siteContentMap = {};
  var siteContentMapLower = {};

  function fetchJSON(url) {
    return fetch(url, { cache: "force-cache" }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status + " for " + url);
      return response.json();
    });
  }

  function mapGamePhrases(english, translated) {
    Object.keys(english || {}).forEach(function (key) {
      var source = english[key];
      var target = translated && translated[key];
      if (typeof source === "string" && typeof target === "string" && source && target && source !== target) {
        gameMap[source] = target;
        gameMapLower[source.toLowerCase()] = target;
      }
    });
  }

  function mapSiteContent(translated) {
    Object.keys(translated || {}).forEach(function (source) {
      var target = translated[source];
      if (typeof target === "string" && target) {
        siteContentMap[source] = target;
        siteContentMapLower[source.toLowerCase()] = target;
      }
    });
  }

  var scriptUrl = document.currentScript && document.currentScript.src ? document.currentScript.src : window.location.href;
  var dataBase = new URL("../../apps/infinite-loot-loop/data/localization/", scriptUrl).href;
  var siteContentBase = new URL("../i18n/site-content/", scriptUrl).href;
  var localizationVersion = "3";
  var ready = code === "en" ? Promise.resolve() : Promise.all([
    fetchJSON(dataBase + "en.json?v=" + localizationVersion), fetchJSON(dataBase + "en_content.json?v=" + localizationVersion),
    fetchJSON(dataBase + code + ".json?v=" + localizationVersion), fetchJSON(dataBase + code + "_content.json?v=" + localizationVersion),
    fetchJSON(siteContentBase + code + ".json?v=" + localizationVersion)
  ]).then(function (files) {
    mapGamePhrases(files[0], files[2]);
    mapGamePhrases(files[1], files[3]);
    mapSiteContent(files[4]);
  }).catch(function (error) {
    if (window.console && console.warn) console.warn("Tony Works translations could not be loaded:", error);
  });

  function translatePhrase(value) {
    var source = String(value == null ? "" : value);
    if (code === "en" || !source) return source;
    if (siteMap[source]) return siteMap[source];
    if (siteContentMap[source]) return siteContentMap[source];
    if (gameMap[source]) return gameMap[source];
    var lower = source.toLowerCase();
    if (siteMapLower[lower]) return siteMapLower[lower];
    if (siteContentMapLower[lower]) return siteContentMapLower[lower];
    if (gameMapLower[lower]) return gameMapLower[lower];

    var hard = source.match(/^(.*?)(\s(?:\[H\]|H))$/);
    if (hard && gameMap[hard[1]]) return gameMap[hard[1]] + hard[2];

    var count = source.match(/^(\d[\d,]*) entries$/);
    if (count) return count[1] + " " + (siteMap.entries || "entries");

    var catalogCount = source.match(/^(\d[\d,]*) (monsters|bosses|items|maps|characters)( \(Normal \+ Hard\))?$/);
    if (catalogCount) {
      var noun = catalogCount[2].charAt(0).toUpperCase() + catalogCount[2].slice(1);
      var suffix = catalogCount[3] ? " (" + translatePhrase("Normal") + " + " + translatePhrase("Hard") + ")" : "";
      return catalogCount[1] + " " + translatePhrase(noun) + suffix;
    }

    var search = source.match(/^Search (.+?)(…|\.\.\.)$/);
    if (search) return (siteMap.Search || "Search") + " " + translatePhrase(search[1]) + search[2];

    return translateUiParts(source);
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Runtime catalog labels often combine multiple concepts in one text node
  // (for example "Rare · Weapon" or "Mode: All"). Translate those short UI
  // composites without partially rewriting long editorial sentences.
  function translateUiParts(source) {
    if (source.length > 100 || source.trim().split(/\s+/).length > 12 || /[.!?]\s*$/.test(source)) return source;
    var result = source;
    Object.keys(siteMap).sort(function (a, b) { return b.length - a.length; }).forEach(function (english) {
      if (english.length < 3) return;
      var boundaryStart = /^[A-Za-z0-9]/.test(english) ? "(^|[^A-Za-z0-9])" : "";
      var boundaryEnd = /[A-Za-z0-9]$/.test(english) ? "(?=$|[^A-Za-z0-9])" : "";
      var pattern = new RegExp(boundaryStart + "(" + escapeRegExp(english) + ")" + boundaryEnd, "gi");
      result = result.replace(pattern, function (_, prefix) {
        return (boundaryStart ? prefix : "") + siteMap[english];
      });
    });
    return result;
  }

  function translateTextNode(node) {
    if (node.parentElement && node.parentElement.closest("[translate='no'],script,style,code,pre")) return;
    var original = node.nodeValue || "";
    var trimmed = original.trim();
    if (!trimmed) return;
    var canonical = trimmed.replace(/\s+/g, " ");
    var translated = translatePhrase(canonical);
    if (translated !== trimmed) node.nodeValue = original.replace(trimmed, translated);
  }

  function translateElement(element) {
    if (!element || element.nodeType !== 1 || element.closest("[translate='no'],script,style,code,pre")) return;
    ["placeholder", "aria-label", "title"].forEach(function (attribute) {
      if (!element.hasAttribute(attribute)) return;
      var original = element.getAttribute(attribute);
      var translated = translatePhrase(original);
      if (translated !== original) element.setAttribute(attribute, translated);
    });
  }

  function translateTree(root) {
    if (code === "en" || !root) return;
    if (root.nodeType === 3) {
      translateTextNode(root);
      return;
    }
    translateElement(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === 3) translateTextNode(node);
      else translateElement(node);
    }
  }

  function localizeGameData(data) {
    if (code === "en" || !data) return data;
    ["enemies", "bosses", "items", "characters", "achievements"].forEach(function (group) {
      (data[group] || []).forEach(function (entry) {
        ["name", "description", "effect", "unlockCondition", "reward", "dropItemName", "hardModeDropItemName", "bonusDropItemName"].forEach(function (field) {
          if (typeof entry[field] === "string") entry[field] = translatePhrase(entry[field]);
        });
        ["zoneNames", "effects"].forEach(function (field) {
          if (Array.isArray(entry[field])) entry[field] = entry[field].map(translatePhrase);
        });
        (entry.drops || []).forEach(function (drop) {
          if (drop && typeof drop.itemName === "string") drop.itemName = translatePhrase(drop.itemName);
        });
      });
    });

    // Area and map display names are exported from Unity but do not have
    // dedicated content keys. Use the localized world plus the stable route
    // code so new routes never fall back to an English asset name.
    var areaByMap = {};
    var areaByCode = {};
    (data.areas || []).forEach(function (area) {
      var localizedWorld = translatePhrase(area.world || "");
      area.name = localizedWorld + (area.code ? " " + area.code : "");
      if (area.mapId) areaByMap[area.mapId] = area;
      if (area.code) areaByCode[area.code] = area;
    });
    (data.maps || []).forEach(function (map) {
      var area = areaByMap[map.id];
      map.name = area ? area.name : (translatePhrase(map.world || "") || translatePhrase(map.name));
    });
    (data.zones || []).forEach(function (zone) {
      var translated = translatePhrase(zone.name);
      if (translated !== zone.name) {
        zone.name = translated;
        return;
      }
      var route = String(zone.id || "").match(/^([A-Z]{2}\d+|VoidHunt)/i);
      var area = route && areaByCode[route[1]];
      if (!area) return;
      var number = String(zone.id || "").match(/(?:Zone|_Z)(\d+)$/i);
      var stage = number ? String(Number(number[1]) + 1) : "";
      var hard = /_HM_/i.test(zone.id || "") ? translatePhrase("Hard") + " " : "";
      zone.name = area.name + " · " + hard + translatePhrase("Zone") + (stage ? " " + stage : "");
    });
    return data;
  }

  function translateDocumentMetadata() {
    if (code === "en") return;
    document.title = translatePhrase(document.title);
    ["meta[property='og:title']", "meta[name='twitter:title']"].forEach(function (selector) {
      var element = document.querySelector(selector);
      if (element) element.setAttribute("content", translatePhrase(element.getAttribute("content")));
    });
  }

  function mountLanguageSelector() {
    if (!document.body || document.getElementById("languagePicker")) return;
    var label = document.createElement("label");
    label.id = "languagePicker";
    label.className = "language-picker";
    label.innerHTML = '<span aria-hidden="true">&#127760;</span><span class="sr-only">' +
      (siteMap.Language || "Language") + '</span><select aria-label="' + (siteMap.Language || "Language") + '"></select>';
    var select = label.querySelector("select");
    LANGUAGES.forEach(function (language) {
      var option = document.createElement("option");
      option.value = language[0]; option.textContent = language[1]; option.selected = language[0] === code;
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      var next = canonicalLanguage(select.value) || "en";
      try { localStorage.setItem("tw-lang", next); } catch (e) {}
      if (typeof window.gtag === "function") window.gtag("event", "language_change", { language: next });
      var url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.location.assign(url.href);
    });
    document.body.appendChild(label);
  }

  function addArticleNotice() {
    if (code === "en") return;
    var page = document.body && document.body.getAttribute("data-page");
    if (["portal", "home", "monsters", "bosses", "items", "sets", "maps", "characters", "achievements", "guide", "game-data", "faq", "patch", "about", "privacy", "terms", "deletion"].indexOf(page) === -1 || document.querySelector(".translation-notice")) return;
    var main = document.querySelector("main") || document.body;
    if (!main) return;
    var notice = document.createElement("aside");
    notice.className = "translation-notice";
    var legalPage = ["privacy", "terms", "deletion"].indexOf(page) !== -1;
    var noticeMessage = legalPage
      ? "This translation is provided for convenience. If it differs from the English version, the English version controls."
      : "This page is available in your language. Game-specific names are synchronized with the current localization files.";
    notice.innerHTML = '<span aria-hidden="true">&#127760;</span><div><strong>' +
      translatePhrase("Translation status") + '</strong><p>' +
      translatePhrase(noticeMessage) + "</p></div>";
    main.insertBefore(notice, main.firstChild);
  }

  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      Array.prototype.forEach.call(record.addedNodes || [], translateTree);
    });
  });

  window.TWI18n = {
    code: code,
    languages: LANGUAGES.slice(),
    ready: ready,
    t: translatePhrase,
    translateTree: translateTree,
    localizeGameData: localizeGameData,
    mountLanguageSelector: mountLanguageSelector
  };

  document.addEventListener("DOMContentLoaded", function () {
    mountLanguageSelector();
    observer.observe(document.body, { childList: true, subtree: true });
    ready.then(function () {
      translateDocumentMetadata();
      translateTree(document.body);
      addArticleNotice();
    });
  });
})();
