/**
 * Демо-профили. Заменяют реальную базу клиентов СберБизнеса.
 * Первые шесть доступны для входа через имитацию SberBusiness ID,
 * остальные образуют пул кандидатов для подбора.
 */

export const GOALS = {
  partnership: 'Партнёрство',
  investment: 'Инвестиции',
  mentorship: 'Менторство',
  clients: 'Клиенты',
  suppliers: 'Поставщики',
  experts: 'Эксперты и подрядчики',
};

export const INDUSTRIES = [
  'Производство',
  'Оптовая торговля',
  'Розница и e-commerce',
  'Логистика',
  'IT и разработка',
  'Строительство',
  'HoReCa',
  'Образование',
  'Сельское хозяйство',
  'Профессиональные услуги',
  'Медицина',
  'Реклама и маркетинг',
];

export const COMPANY_SIZES = ['1–10', '11–50', '51–100', '101–250', '250+'];

const raw = [
  {
    sberId: 'SB-1001',
    fullName: 'Марина Кольцова',
    position: 'Основатель',
    company: 'ООО «Ягодная поляна»',
    inn: '7701234561',
    industry: 'Сельское хозяйство',
    companySize: '11–50',
    region: 'Краснодарский край',
    goals: ['clients', 'partnership'],
    tags: ['заморозка ягод', 'СТМ', 'фермерство', 'HoReCa', 'опт'],
    about:
      'Восемь лет выращиваем и замораживаем ягоду под собственной маркой и под СТМ сетей. Своя линия шоковой заморозки, 900 тонн в сезон.',
    request:
      'Ищу дистрибьюторов и кондитерские производства в ЦФО, которым нужна замороженная ягода стабильного качества под СТМ.',
    avatarColor: '#1F7A4D',
  },
  {
    sberId: 'SB-1002',
    fullName: 'Артём Бельский',
    position: 'Генеральный директор',
    company: 'ООО «Складлогик»',
    inn: '7701234562',
    industry: 'Логистика',
    companySize: '51–100',
    region: 'Москва',
    goals: ['clients', 'partnership'],
    tags: ['фулфилмент', 'маркетплейсы', 'склад', '3PL', 'доставка'],
    about:
      'Фулфилмент для продавцов маркетплейсов: приёмка, хранение, упаковка, отгрузка на Wildberries и Ozon. Два склада по 4000 м² в Москве и Екатеринбурге.',
    request:
      'Нужны производители и импортёры с объёмом от 500 заказов в месяц, которым нужен склад и обработка заказов.',
    avatarColor: '#0F5C8C',
  },
  {
    sberId: 'SB-1003',
    fullName: 'Ольга Пенькова',
    position: 'Коммерческий директор',
    company: 'ООО «Тёплый дом»',
    inn: '7701234563',
    industry: 'Производство',
    companySize: '101–250',
    region: 'Нижний Новгород',
    goals: ['suppliers', 'clients'],
    tags: ['мебель', 'фурнитура', 'опт', 'импортозамещение', 'розница'],
    about:
      'Производим корпусную мебель для розничных сетей и застройщиков. Собственное КБ, 14 000 м² производства.',
    request:
      'Ищу поставщиков фурнитуры и ЛДСП с российским производством — хотим уйти от импорта и сократить сроки поставки.',
    avatarColor: '#8C4A0F',
  },
  {
    sberId: 'SB-1004',
    fullName: 'Дмитрий Хавин',
    position: 'Сооснователь',
    company: 'ООО «Питч Аналитика»',
    inn: '7701234564',
    industry: 'IT и разработка',
    companySize: '11–50',
    region: 'Санкт-Петербург',
    goals: ['investment', 'partnership', 'clients'],
    tags: ['SaaS', 'аналитика', 'B2B', 'данные', 'ритейл'],
    about:
      'Делаем сервис прогноза спроса для розницы. 40 клиентов, выручка 68 млн в год, растём на 90% год к году.',
    request:
      'Ищу соинвестора на раунд A и партнёров-интеграторов, которые внедряют учётные системы в рознице.',
    avatarColor: '#3B2E8C',
  },
  {
    sberId: 'SB-1005',
    fullName: 'Ирина Савельева',
    position: 'Владелец',
    company: 'Сеть кофеен «Зерно и Пар»',
    inn: '7701234565',
    industry: 'HoReCa',
    companySize: '51–100',
    region: 'Казань',
    goals: ['suppliers', 'mentorship', 'partnership'],
    tags: ['кофейни', 'франшиза', 'обжарка', 'десерты', 'сеть'],
    about:
      'Девять кофеен в Казани и Челнах, готовим упаковку франшизы. Средний чек 480 ₽, выручка 210 млн в год.',
    request:
      'Нужен ментор, который уже упаковывал и масштабировал франшизу в общепите, и поставщик десертов глубокой заморозки.',
    avatarColor: '#7A1F3D',
  },
  {
    sberId: 'SB-1006',
    fullName: 'Сергей Демидов',
    position: 'Управляющий партнёр',
    company: 'ООО «Демидов и партнёры»',
    inn: '7701234566',
    industry: 'Профессиональные услуги',
    companySize: '11–50',
    region: 'Москва',
    goals: ['clients', 'experts'],
    tags: ['налоги', 'сделки M&A', 'юристы', 'структурирование', 'due diligence'],
    about:
      'Юридическое сопровождение сделок для среднего бизнеса: проверка, структурирование, налоговые споры. 60+ закрытых сделок.',
    request:
      'Ищу собственников, которые готовят бизнес к продаже или привлечению инвестиций — сопровождаем сделку от аудита до подписания.',
    avatarColor: '#1A1A1A',
  },
  {
    sberId: 'SB-1007',
    fullName: 'Наталья Гринёва',
    position: 'Основатель',
    company: 'ООО «Кондитер Про»',
    inn: '7701234567',
    industry: 'Производство',
    companySize: '51–100',
    region: 'Воронеж',
    goals: ['suppliers', 'clients'],
    tags: ['кондитерская', 'десерты', 'заморозка', 'HoReCa', 'сырьё'],
    about:
      'Производим замороженные десерты для кофеен и ресторанов. 6 тонн продукции в месяц, поставки в 30 городов.',
    request:
      'Ищу поставщиков ягодного сырья и новых клиентов среди сетей кофеен, которым нужны десерты с коротким циклом подачи.',
    avatarColor: '#A3561F',
  },
  {
    sberId: 'SB-1008',
    fullName: 'Павел Лунёв',
    position: 'Генеральный директор',
    company: 'ООО «Фурнитура НН»',
    inn: '7701234568',
    industry: 'Производство',
    companySize: '101–250',
    region: 'Нижний Новгород',
    goals: ['clients', 'partnership'],
    tags: ['фурнитура', 'мебель', 'импортозамещение', 'ЛДСП', 'опт'],
    about:
      'Производим мебельную фурнитуру: направляющие, петли, подъёмники. Запустили линию взамен импортных аналогов.',
    request:
      'Ищу мебельные фабрики, которым нужна российская фурнитура с поставкой за 5 дней вместо трёх месяцев из Китая.',
    avatarColor: '#4A5A1F',
  },
  {
    sberId: 'SB-1009',
    fullName: 'Алексей Тарасов',
    position: 'Инвестиционный директор',
    company: 'ООО «Волга Капитал»',
    inn: '7701234569',
    industry: 'Профессиональные услуги',
    companySize: '1–10',
    region: 'Самара',
    goals: ['investment', 'partnership'],
    tags: ['венчур', 'раунд A', 'B2B SaaS', 'соинвестиции', 'ритейл-тех'],
    about:
      'Инвестируем от 30 до 150 млн ₽ в B2B-продукты с выручкой от 50 млн. В портфеле 11 компаний.',
    request:
      'Ищу основателей B2B SaaS с подтверждённой выручкой и соинвесторов в синдикат на раунды A.',
    avatarColor: '#1F4A7A',
  },
  {
    sberId: 'SB-1010',
    fullName: 'Екатерина Мороз',
    position: 'Основатель',
    company: 'ИП Мороз Е. В.',
    inn: '7701234570',
    industry: 'Розница и e-commerce',
    companySize: '11–50',
    region: 'Екатеринбург',
    goals: ['suppliers', 'experts'],
    tags: ['маркетплейсы', 'детские товары', 'фулфилмент', 'Wildberries', 'упаковка'],
    about:
      'Продаю детские товары на маркетплейсах, 12 000 заказов в месяц, своя торговая марка.',
    request:
      'Нужен фулфилмент-оператор в Екатеринбурге и подрядчик по карточкам и рекламе внутри маркетплейсов.',
    avatarColor: '#8C1F5C',
  },
  {
    sberId: 'SB-1011',
    fullName: 'Рустам Валиев',
    position: 'Директор по развитию',
    company: 'ООО «ТехноСтрой Групп»',
    inn: '7701234571',
    industry: 'Строительство',
    companySize: '250+',
    region: 'Казань',
    goals: ['suppliers', 'partnership'],
    tags: ['застройщик', 'отделка', 'мебель', 'подряд', 'тендеры'],
    about:
      'Строим и сдаём жилые комплексы с отделкой под ключ. 180 000 м² в работе.',
    request:
      'Ищу производителей мебели и отделочных материалов, готовых к объёмам от 300 квартир в партии.',
    avatarColor: '#5C5C5C',
  },
  {
    sberId: 'SB-1012',
    fullName: 'Анна Ветрова',
    position: 'Основатель',
    company: 'ООО «Кадры Роста»',
    inn: '7701234572',
    industry: 'Образование',
    companySize: '11–50',
    region: 'Москва',
    goals: ['clients', 'partnership'],
    tags: ['обучение', 'продажи', 'HR', 'корпоративные программы', 'наставничество'],
    about:
      'Обучаем отделы продаж среднего бизнеса. 140 корпоративных программ, средний рост конверсии клиентов — 22%.',
    request:
      'Ищу компании с отделом продаж от 10 человек и партнёров по внедрению CRM для совместных проектов.',
    avatarColor: '#7A3D1F',
  },
  {
    sberId: 'SB-1013',
    fullName: 'Игорь Пешков',
    position: 'Совладелец',
    company: 'ООО «Уралхолод»',
    inn: '7701234573',
    industry: 'Логистика',
    companySize: '51–100',
    region: 'Екатеринбург',
    goals: ['clients', 'suppliers'],
    tags: ['рефрижераторы', 'заморозка', 'доставка', 'склад', 'пищёвка'],
    about:
      'Перевозки и хранение замороженной продукции по Уралу и Сибири. 40 рефрижераторов, склад на 3000 паллет.',
    request:
      'Ищу производителей замороженной продукции, которым нужна логистика от производства до сети.',
    avatarColor: '#1F6E7A',
  },
  {
    sberId: 'SB-1014',
    fullName: 'Светлана Рожкова',
    position: 'Генеральный директор',
    company: 'ООО «Медлайн Клиник»',
    inn: '7701234574',
    industry: 'Медицина',
    companySize: '101–250',
    region: 'Новосибирск',
    goals: ['investment', 'experts'],
    tags: ['клиники', 'сеть', 'медтех', 'масштабирование', 'лицензирование'],
    about:
      'Сеть из четырёх многопрофильных клиник, 60 000 приёмов в год. Открываем пятую.',
    request:
      'Ищу соинвестора на открытие клиник в городах-миллионниках и эксперта по медицинскому лицензированию.',
    avatarColor: '#0F7A6E',
  },
  {
    sberId: 'SB-1015',
    fullName: 'Кирилл Асташев',
    position: 'Основатель',
    company: 'ООО «Гринтек Упаковка»',
    inn: '7701234575',
    industry: 'Производство',
    companySize: '11–50',
    region: 'Санкт-Петербург',
    goals: ['clients', 'investment'],
    tags: ['упаковка', 'эко', 'пищёвка', 'производство', 'СТМ'],
    about:
      'Производим биоразлагаемую упаковку для еды навынос. Три линии, клиенты — сети кофеен и доставки.',
    request:
      'Ищу сети общепита, которым нужна эко-упаковка под брендом, и инвестора на четвёртую линию.',
    avatarColor: '#2E7A1F',
  },
  {
    sberId: 'SB-1016',
    fullName: 'Марат Юсупов',
    position: 'Директор',
    company: 'ООО «Диджитал Ставка»',
    inn: '7701234576',
    industry: 'Реклама и маркетинг',
    companySize: '11–50',
    region: 'Москва',
    goals: ['clients', 'partnership'],
    tags: ['маркетплейсы', 'performance', 'карточки товаров', 'реклама', 'e-commerce'],
    about:
      'Агентство под маркетплейсы: карточки, внутренняя реклама, аналитика ниш. 70 клиентов на сопровождении.',
    request:
      'Ищу продавцов на Wildberries и Ozon с оборотом от 5 млн в месяц и партнёров по фулфилменту.',
    avatarColor: '#8C6E0F',
  },
  {
    sberId: 'SB-1017',
    fullName: 'Виктория Ланская',
    position: 'Основатель',
    company: 'ООО «Ланская Дистрибуция»',
    inn: '7701234577',
    industry: 'Оптовая торговля',
    companySize: '51–100',
    region: 'Москва',
    goals: ['suppliers', 'partnership'],
    tags: ['дистрибуция', 'продукты питания', 'сети', 'СТМ', 'опт'],
    about:
      'Дистрибуция продуктов питания в федеральные и региональные сети. Работаем с 11 сетями в ЦФО.',
    request:
      'Ищу производителей продуктов с готовой документацией, которым нужен вход в сети ЦФО.',
    avatarColor: '#5C1F8C',
  },
  {
    sberId: 'SB-1018',
    fullName: 'Андрей Бортник',
    position: 'Технический директор',
    company: 'ООО «Интегра Системс»',
    inn: '7701234578',
    industry: 'IT и разработка',
    companySize: '51–100',
    region: 'Новосибирск',
    goals: ['partnership', 'clients'],
    tags: ['внедрение', '1С', 'интеграции', 'ритейл', 'автоматизация'],
    about:
      'Внедряем учётные и складские системы в рознице и опте. 200+ проектов внедрения.',
    request:
      'Ищу вендоров аналитических и складских продуктов для партнёрства по внедрению у наших клиентов.',
    avatarColor: '#1F3D8C',
  },
  {
    sberId: 'SB-1019',
    fullName: 'Елена Тихая',
    position: 'Владелец',
    company: 'ООО «Мастерская вкуса»',
    inn: '7701234579',
    industry: 'HoReCa',
    companySize: '11–50',
    region: 'Краснодар',
    goals: ['suppliers', 'clients'],
    tags: ['рестораны', 'десерты', 'локальные продукты', 'меню', 'сеть'],
    about:
      'Три ресторана локальной кухни в Краснодаре, готовим четвёртый и линейку доставки.',
    request:
      'Ищу локальных производителей ягод, сыров и десертов для обновления меню и линейки доставки.',
    avatarColor: '#7A5C1F',
  },
  {
    sberId: 'SB-1020',
    fullName: 'Максим Гурин',
    position: 'Основатель',
    company: 'ООО «Гурин Экспорт»',
    inn: '7701234580',
    industry: 'Оптовая торговля',
    companySize: '11–50',
    region: 'Ростов-на-Дону',
    goals: ['partnership', 'suppliers'],
    tags: ['экспорт', 'СНГ', 'продукты питания', 'логистика', 'сертификация'],
    about:
      'Экспортируем продукты питания в Казахстан, Узбекистан и Армению. Своя сертификация и таможенное сопровождение.',
    request:
      'Ищу производителей продуктов, готовых к экспорту, и партнёров по международной логистике.',
    avatarColor: '#0F6E4A',
  },
];

/**
 * Демо-фото профилей: по одному на предпринимателя, в порядке массива raw выше.
 *
 * Отбирались вручную по четырём признакам: деловой вид (рубашка, пиджак,
 * опрятный кадр), спокойное выражение лица, нейтральный или размытый фон и
 * крупный план — поясные снимки в круглом аватаре 38px превращают лицо в точку.
 * Исключены студийно-модные и художественные портреты, головные уборы, тёмные
 * очки, а также диапазон male/42–71: там лежат сгенерированные лица, которые
 * выдают себя пластиковой кожей и пустым фоном.
 *
 * Пол фотографии соответствует имени профиля.
 */
const PHOTOS = [
  'https://xsgames.co/randomusers/assets/avatars/female/21.jpg', // Марина Кольцова
  'https://xsgames.co/randomusers/assets/avatars/male/7.jpg', // Артём Бельский
  'https://xsgames.co/randomusers/assets/avatars/female/18.jpg', // Ольга Пенькова
  'https://xsgames.co/randomusers/assets/avatars/male/2.jpg', // Дмитрий Хавин
  'https://xsgames.co/randomusers/assets/avatars/female/17.jpg', // Ирина Савельева
  'https://xsgames.co/randomusers/assets/avatars/male/25.jpg', // Сергей Демидов
  'https://xsgames.co/randomusers/assets/avatars/female/19.jpg', // Наталья Гринёва
  'https://xsgames.co/randomusers/assets/avatars/male/41.jpg', // Павел Лунёв
  'https://xsgames.co/randomusers/assets/avatars/male/9.jpg', // Алексей Тарасов
  'https://xsgames.co/randomusers/assets/avatars/female/23.jpg', // Екатерина Мороз
  'https://xsgames.co/randomusers/assets/avatars/male/72.jpg', // Рустам Валиев
  'https://xsgames.co/randomusers/assets/avatars/female/20.jpg', // Анна Ветрова
  'https://xsgames.co/randomusers/assets/avatars/male/37.jpg', // Игорь Пешков
  'https://xsgames.co/randomusers/assets/avatars/female/55.jpg', // Светлана Рожкова
  'https://xsgames.co/randomusers/assets/avatars/male/8.jpg', // Кирилл Асташев
  'https://xsgames.co/randomusers/assets/avatars/male/75.jpg', // Марат Юсупов
  'https://xsgames.co/randomusers/assets/avatars/female/22.jpg', // Виктория Ланская
  'https://xsgames.co/randomusers/assets/avatars/male/26.jpg', // Андрей Бортник
  'https://xsgames.co/randomusers/assets/avatars/female/77.jpg', // Елена Тихая
  'https://xsgames.co/randomusers/assets/avatars/male/35.jpg', // Максим Гурин
];

export function buildSeed() {
  const now = new Date().toISOString();
  return raw.map((r, i) => ({
    id: `seed-${String(i + 1).padStart(3, '0')}`,
    sberId: r.sberId,
    fullName: r.fullName,
    position: r.position,
    company: r.company,
    inn: r.inn,
    companyStatus: 'active',
    industry: r.industry,
    companySize: r.companySize,
    region: r.region,
    goals: r.goals,
    tags: r.tags,
    about: r.about,
    request: r.request,
    avatar: null,
    photo: PHOTOS[i],
    avatarColor: r.avatarColor,
    privacy: { showCompany: true, showPosition: true, showRegion: true },
    profileComplete: true,
    isSeed: true,
    createdAt: now,
    lastLoginAt: now,
  }));
}
