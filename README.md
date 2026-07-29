# 니알라토텝의 가면들 — 핸드아웃 아카이브

크툴루의 부름 캠페인 《니알라토텝의 가면들》에서 **받은 핸드아웃**을 정리하는 정적 웹사이트.
플레이어 시점의 자료실입니다. 조사 중에 실제로 손에 들어온 문서와, 그 문서에서 읽어 낼 수 있는 내용만 들어갑니다.

## 두 가지 판

| 파일 | 용도 |
|---|---|
| **[index.html](index.html)** | **플레이어판.** 핸드아웃과 거기서 알 수 있는 정보뿐. 키퍼 메모 파일을 아예 읽지 않으므로 볼 수 있는 방법이 없습니다. |
| [keeper.html](keeper.html) | 키퍼판. 위와 똑같은 자료에 `data/keeper-notes.js` 의 메모가 얹힙니다. 상단 '키퍼 메모' 스위치로 켜고 끕니다. |

둘은 같은 `data/handouts.js` 를 봅니다. 자료를 한 번만 적으면 양쪽에 반영됩니다.

브라우저로 열기만 하면 됩니다. 서버도 빌드도 필요 없습니다.

## 화면

- **아카이브** — 자료 카드. 유형·검색어로 걸러 봅니다.
- **연표** — 1919년부터 이어지는 사건을 시간순으로.
- **인물** — 자료에 이름이 나온 사람들. 생존/사망/행방 불명 상태와 등장 자료 링크.
- **엘리어스 장서** — 잭슨 엘리어스의 저작 8권.

## 기능

- 자료를 클릭하면 유형에 맞는 지면으로 펼쳐집니다 (신문은 2단 조판, 전보는 전보 용지, 인물 정보는 서류철).
- 상세 화면의 **인쇄 / PDF** 버튼은 장식을 걷고 문서만 인쇄합니다.
- 주소창에 `#us-01` 처럼 자료 ID를 붙이면 그 문서가 바로 열립니다.
- 단축키: `/` 검색창 이동, `Esc` 문서 닫기.

## 자료 추가

`data/handouts.js` 한 파일만 편집합니다. 서식과 예시는 [data/README.md](data/README.md) 참고.

**원칙:** 이 파일에는 캐릭터가 실제로 알아낸 것만 적습니다. 추측은 추측이라고 적고, 아직 확인 못 한 건 넣지 않습니다.

## 웹에 올리기 (Vercel)

**플레이어판만** 올라갑니다. `keeper.html` 과 `data/keeper-notes.js` 는 `.vercelignore` 와 `.gitignore` 양쪽에서 제외되어 있어 업로드되지 않습니다.
이 두 파일은 로컬에만 남으니, 키퍼분께 넘길 때는 파일을 직접 전달하세요.

### 처음 배포

```bash
npx vercel login
```

```bash
npx vercel --prod
```

프로젝트 이름과 디렉터리를 묻는 질문에 답하면 끝입니다. 빌드 설정은 건드릴 필요 없습니다(Framework: Other, 빌드 명령 없음).

### 자료를 추가한 뒤

`data/handouts.js` 를 저장하고 `npx vercel --prod` 를 다시 실행하면 갱신됩니다.

### 배포 후 반드시 확인

주소창에 아래 두 개를 직접 쳐서 **404가 뜨는지** 확인하세요. 200이 뜨면 키퍼 메모가 공개된 것입니다.

- `https://<사이트주소>/keeper.html`
- `https://<사이트주소>/data/keeper-notes.js`

### 설정 파일

- `vercel.json` — 검색엔진 색인 차단(`X-Robots-Tag: noindex`), 자료 파일 캐시 없음(수정하면 바로 반영)
- `robots.txt` — 크롤러 차단
- 색인되기를 원하면 두 파일에서 해당 항목을 지우면 됩니다.

## 만든 재료

- 글꼴: [Cinzel](https://fonts.google.com/specimen/Cinzel), [Nanum Myeongjo](https://fonts.google.com/specimen/Nanum+Myeongjo), [Gowun Batang](https://fonts.google.com/specimen/Gowun+Batang), [Special Elite](https://fonts.google.com/specimen/Special+Elite), [Nanum Pen Script](https://fonts.google.com/specimen/Nanum+Pen+Script) — 모두 SIL Open Font License.
- 아르데코 장식(선버스트, 모서리 괘선, 필름 그레인)은 전부 CSS/SVG. 외부 라이브러리 없음.

## 현재 수록

미국(뉴욕) 챕터 9건 — 잭슨 엘리어스 인물 정보, 전보, 칼라일 탐사대 관련 신문 기사 7건.
본문은 이미지에서 옮겨 적은 것이라 오탈자가 있을 수 있습니다. `data/handouts.js` 에서 바로 고칠 수 있습니다.
