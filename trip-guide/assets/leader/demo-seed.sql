-- DEMO 示範資料：北海道 6 日示範團（日幣）。day＝第幾天（1 起算）、item＝行程固定編號 k，對應 index.html 的 DAYS
-- 示範收據 demo-receipts/ 是泰銖的假收據，用來試 AI 判讀換幣別
DELETE FROM leader_ledger; DELETE FROM leader_settings;
INSERT INTO leader_settings (key, value) VALUES
 ('trip_name','北海道 6 日示範團'), ('company','○○旅行社（示範）'), ('leader','示範領隊'), ('guide','示範導遊'),
 ('currency','JPY'), ('currency_name','日幣'), ('rate_dir','twd_per_local'),
 ('guide_rate', CAST(1.0/0.215 AS TEXT)), ('cash_rate', CAST(1.0/0.21 AS TEXT)),
 ('advance','30000'), ('petty_cash','3000');
-- 導遊代付（導遊匯率 1 日幣 = 0.215 台幣）
INSERT INTO leader_ledger (day,item,spent_on,category,vendor,place,content,currency,amount_local,rate,amount_twd,twd_manual,payer,method,note,status,created_at,updated_at) VALUES
 (1,4,'2027-07-15','餐飲','成吉思汗烤肉（示範）','札幌','8 人晚餐','JPY',28000,1.0/0.215,28000*0.215,0,'guide','guide_rate','','confirmed',1,1),
 (2,2,'2027-07-16','餐飲','三角市場海鮮丼（示範）','小樽','8 人午餐','JPY',20000,1.0/0.215,20000*0.215,0,'guide','guide_rate','','confirmed',2,2),
 (3,2,'2027-07-17','餐飲','哈密瓜午餐（示範）','富良野','8 人午餐','JPY',16000,1.0/0.215,16000*0.215,0,'guide','guide_rate','','confirmed',3,3),
 (4,1,'2027-07-18','門票','旭山動物園','旭川','大人 6 張（小孩免費）','JPY',6000,1.0/0.215,6000*0.215,0,'guide','guide_rate','','confirmed',4,4);
-- 領隊刷卡＋現金
INSERT INTO leader_ledger (day,item,spent_on,category,vendor,place,content,currency,amount_local,rate,amount_twd,twd_manual,payer,method,note,status,created_at,updated_at) VALUES
 (2,5,'2027-07-16','招待','LeTAO（示範）','小樽','請全團吃起司蛋糕','JPY',3200,1.0/0.21,3200*0.21,0,'leader','cash','','confirmed',5,5),
 (5,0,'2027-07-19','交通','高速巴士（示範）','札幌','札幌 → 登別 8 張','JPY',17600,1.0/0.21,3650,1,'leader','card','刷卡帳單實際台幣 3,650','confirmed',6,6),
 (NULL,NULL,'2027-07-20','交通','台灣機場接送','桃園機場','領隊機場接送','TWD',2400,1,2400,0,'leader','card','','confirmed',7,7);
