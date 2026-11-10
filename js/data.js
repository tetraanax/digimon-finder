/* 파트너 후보 목록 — 여기만 고치면 후보를 추가·수정할 수 있어요.
   attr: vac 백신 / dat 데이터 / vir 바이러스 / fre 프리
   size: 1 작고 날렵 · 2 보통 · 3 크고 듬직
   vibe: brave 용감 · calm 침착 · clever 영리 · gentle 다정 · wild 자유
   line: 성숙기 → 완전체 → 궁극체 진화 루트 ('?'는 건너뛰어요)
   img : 이미지 경로나 주소 (예: 'img/agumon.png'). 비워 두면 도트 알 그림이 나와요. */
window.DIGI = [
  {ko:'아구몬',en:'Agumon',attr:'vac',type:'파충류형',size:2,vibe:['brave','wild'],line:['그레이몬','메탈그레이몬','워그레이몬'],img:'',d:'데이터가 바닥나면 못 참고, 친구가 위험하면 더 못 참는 타입. 단순하지만 그래서 믿음직해요.'},
  {ko:'파피몬',en:'Gabumon',attr:'dat',type:'파충류형',size:2,vibe:['calm','gentle'],line:['가루몬','워가루몬','메탈가루몬'],img:'',d:'수줍음이 많아 털가죽 뒤에 숨지만, 한번 마음을 열면 끝까지 곁을 지켜요.'},
  {ko:'피요몬',en:'Biyomon',attr:'vac',type:'새형',size:1,vibe:['gentle','wild'],line:['버드라몬','가루다몬','페닉스몬'],img:'',d:'밝고 수다스러워서 곁에 있으면 분위기가 금세 환해져요.'},
  {ko:'텐타몬',en:'Tentomon',attr:'vac',type:'곤충형',size:2,vibe:['clever','calm'],line:['캅테리몬','아트라캅테리몬','헤라클레스캅테리몬'],img:'',d:'궁금한 건 꼭 알아내야 직성이 풀리는 박식한 조언자예요.'},
  {ko:'팔몬',en:'Palmon',attr:'dat',type:'식물형',size:1,vibe:['gentle','wild'],line:['니드몬','릴리몬','로제몬'],img:'',d:'호기심 많고 천진난만해서 어디서든 금방 친구를 만들어요.'},
  {ko:'쉬라몬',en:'Gomamon',attr:'vac',type:'해수형',size:2,vibe:['wild','gentle'],line:['원뿔몬','쥬드몬','바이킹몬'],img:'',d:'장난기 가득한 분위기 메이커. 힘든 순간에도 웃음을 잃지 않아요.'},
  {ko:'파닥몬',en:'Patamon',attr:'dat',type:'포유류형',size:1,vibe:['gentle','brave'],line:['엔젤몬','홀리엔젤몬','세라피몬'],img:'',d:'작고 순하지만 지켜야 할 것 앞에서는 누구보다 단단해져요.'},
  {ko:'브이몬',en:'Veemon',attr:'fre',type:'소룡형',size:2,vibe:['brave','wild'],line:['엑스브이몬','파일드라몬','황제드라몬 - 파이터 모드'],img:'',d:'자신감 넘치고 앞장서기 좋아하는 열혈 파트너예요.'},
  {ko:'추추몬',en:'Wormmon',attr:'fre',type:'유충형',size:1,vibe:['gentle','calm'],line:['스팅몬','주엘비몬','타이거베스파몬'],img:'',d:'조용하고 헌신적이에요. 당신이 길을 잃어도 묵묵히 기다려 줘요.'},
  {ko:'호크몬',en:'Hawkmon',attr:'fre',type:'새형',size:1,vibe:['calm','clever'],line:['아큐라몬','실피드몬','발키리몬'],img:'',d:'예의 바르고 침착한 신사. 위기에서도 품위를 잃지 않아요.'},
  {ko:'아르마몬',en:'Armadillomon',attr:'fre',type:'포유류형',size:3,vibe:['calm','gentle'],line:['황금아르마몬','?','?'],img:'',d:'느긋하고 여유로운 성격. 곁에 있으면 마음이 편안해져요.'},
  {ko:'길몬',en:'Guilmon',attr:'vir',type:'파충류형',size:3,vibe:['wild','gentle'],line:['그라우몬','메가로그라우몬','듀크몬'],img:'',d:'빵을 좋아하는 순진한 대식가. 하지만 숨은 힘은 엄청나요.'},
  {ko:'테리어몬',en:'Terriermon',attr:'vac',type:'짐승형',size:1,vibe:['wild','calm'],line:['가르고몬','래피드몬','세인트가르고몬'],img:'',d:'"괜찮아, 괜찮아"가 입버릇인 낙천가. 귀로 날 수도 있어요.'},
  {ko:'레나몬',en:'Renamon',attr:'dat',type:'짐승형',size:2,vibe:['calm','clever'],line:['구미호몬','도사몬','샤크라몬'],img:'',d:'냉정하고 독립적이지만, 신뢰하는 상대에겐 누구보다 충실해요.'},
  {ko:'로프몬',en:'Lopmon',attr:'dat',type:'짐승형',size:1,vibe:['gentle','calm'],line:['토리에몬','안티라몬','케루비몬(선)'],img:'',d:'얌전하고 배려심 깊어요. 작은 변화도 먼저 알아채 줘요.'},
  {ko:'임프몬',en:'Impmon',attr:'vir',type:'마인형',size:1,vibe:['wild','clever'],line:['?','?','베르제브몬'],img:'',d:'삐딱하고 말썽꾸러기지만 속은 의외로 여린 반항아예요.'},
  {ko:'가오몬',en:'Gaomon',attr:'dat',type:'짐승형',size:2,vibe:['brave','calm'],line:['가오가몬','마하가오가몬','미라쥬가오가몬'],img:'',d:'규칙과 훈련을 중시하는 성실한 파이터. 주인을 향한 충성심이 깊어요.'},
  {ko:'라라몬',en:'Lalamon',attr:'dat',type:'식물형',size:1,vibe:['gentle','clever'],line:['해바라기몬','릴리몬','로제몬'],img:'',d:'다정한 누나 같은 존재. 노래로 마음을 달래 줘요.'},
  {ko:'에렉몬',en:'Elecmon',attr:'dat',type:'포유류형',size:1,vibe:['brave','wild'],line:['레오몬','아이언레오몬','반쵸레오몬'],img:'',d:'꼬리에서 전기를 내뿜는 열정가. 어린 친구들을 잘 챙겨요.'},
  {ko:'베타몬',en:'Betamon',attr:'vir',type:'양서류형',size:2,vibe:['calm','gentle'],line:['시드라몬','메가시드라몬','메탈시드라몬'],img:'',d:'물가를 좋아하는 온순한 친구. 겉보기보다 사람을 잘 따라요.'},
  {ko:'울퉁몬',en:'Gotsumon',attr:'dat',type:'광물형',size:2,vibe:['wild','brave'],line:['모노크로몬','?','?'],img:'',d:'성질은 급하지만 뒤끝 없는 돌멩이 친구. 의외로 장난을 좋아해요.'},
  {ko:'고부리몬',en:'Goblimon',attr:'vir',type:'요정형',size:2,vibe:['wild','clever'],line:['우가몬','?','?'],img:'',d:'꾀가 많고 제멋대로지만, 한번 의리를 맺으면 진심이에요.'},
  {ko:'드라코몬',en:'Dracomon',attr:'dat',type:'소룡형',size:2,vibe:['brave','calm'],line:['코어드라몬','윙드라몬','슬레이어드라몬'],img:'',d:'용의 피를 이은 자존심 강한 친구. 강해지려는 의지가 남달라요.'},
  {ko:'톱니몬',en:'Hagurumon',attr:'vir',type:'머신형',size:2,vibe:['clever','calm'],line:['가드로몬','안드로몬','하이안드로몬'],img:'',d:'톱니바퀴처럼 정확하고 논리적이에요. 계획 세우기의 달인.'},
  {ko:'루나몬',en:'Lunamon',attr:'dat',type:'포유류형',size:1,vibe:['gentle','calm'],line:['레키스몬','크레세몬','디아나몬'],img:'',d:'달빛을 닮은 섬세한 성격. 외로움을 잘 타지만 그만큼 정이 깊어요.'},
  {ko:'코로나몬',en:'Coronamon',attr:'vac',type:'짐승형',size:2,vibe:['brave','wild'],line:['파이라몬','플레어몬','아폴로몬'],img:'',d:'태양처럼 뜨거운 정의파. 불의를 보면 못 참아요.'},
  {ko:'도루몬',en:'Dorumon',attr:'dat',type:'짐승형',size:2,vibe:['wild','brave'],line:['도루가몬','도루그레몬','알파몬'],img:'',d:'자유를 사랑하는 야생아. 새로운 데이터와 모험이라면 언제든 OK.'},
  {ko:'코테몬',en:'Kotemon',attr:'dat',type:'파충류형',size:1,vibe:['brave','calm'],line:['다이노휴몬','?','?'],img:'',d:'수줍지만 수련에는 진지한 검도 소년. 묵묵히 실력을 쌓아요.'},
];
