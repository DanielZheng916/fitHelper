create a desktop tool set


allow chinese/english input
run on MacOS


Tool 1
can convert mph to min/km, convert min/km to mph, min/km example is 6:46min/km, 6min and 46 seconds.
save recent 10 converts for quick reference


Tool 2
have a place to save my recent common Cals, like """主食
鸡蛋*1			75
鸡蛋*5			375
咖喱块*1餐		300
鸡肉*1磅		600
洋葱			40
咖喱正餐		940
咖喱小餐		630
炸鸡（breast）	400
炸鸡（thigh）		300
炸鸡（leg）		180
小排骨汤		600
排骨汤*1磅		900
煎干贝			220
泡面			380/440


小食
拿铁			100
牛奶			100
橙汁			100
腰果*6			50
椰子水			60
酥饼			180


酒
威士忌1.5oz		100
朗姆1.5oz		100
啤酒*1罐		142
葡萄酒*半瓶		315"""


Tool 3
a place to set daily Cal target and calculate current Cal automate
like """1750/1800
咖啡120
小咖喱630
咖啡120
+小咖喱630
+冰淇淋100
+威士忌150"""
the '+' in the example means still not eat, need a way like this to let me check it's eated or not
can change the item order by drag to remind me the eating order

using the contents in Tool 2, suggest 1 item going to eat when the current sum is less than the target, helping user decide which food to eat next to decrese thinking and anxiety.


Tool 4
have a place to put my current training record like
"""Week 83
4.6
平板卷腹*5
腿推*5
高位下拉*5
哑铃卧推*3
锤式弯举*3

4.7
3A
5.2 mph × 40 min
3.47mile 心率164
累到

4.9
3B
5.0 mph × 5 min + 6.0 mph × 10 min + 5.8 mph × 5 min
1.9mile 心率168
平板卷腹*4

4.11
3C
5.2 mph × 55 min
4.77mile 心率171
进步了

Week 84
4.13
4A
5.3 mph × 40 min
3.53mile 心率177

4.14
4B
5.0 mph × 5 min + 6.0 mph × 12 min
1.62mile 心率173
二头弯举*4

4.16
4C
5.2 mph × 60 min
5.2mile 心率176
竟然完成了

Week 85
4.20
平板卷腹*4
腿推*5
腿伸展*2
高位下拉*5
二头弯举*2

4.21
5A
5.2 mph × 40 min
3.47mile 心率178

4.23
5B
5.0 mph × 5 min + 6.2 mph × 8 min + 
walk 3 min + 6.2 mph × 8 min
2.07mile 心率171
高位下拉*2
二头弯举*2

4.25
5C
4.8 mph × 65 min
7:46
心率161
合理的降速"""

And a place to put my plan like """🟢 第1阶段（1–4周）建立有氧基础

✅ 第1周

	•	A：5.2 mph × 35 min
	•	B：5.8 mph × 8 min
	•	C：5.0 mph × 45 min

✅ 第2周

	•	A：5.2 mph × 38 min
	•	B：5.8 mph × 10 min + 6.0 mph × 5 min
	•	C：5.2 mph × 50 min

✅ 第3周

	•	A：5.2 mph × 40 min
	•	B：6.0 mph × 10 min + 5.8 mph × 5 min
	•	C：5.2 mph × 55 min

✅ 第4周

	•	A：5.3 mph × 40 min
	•	B：6.0 mph × 12 min
	•	C：5.2 mph × 60 min

🎯 目标：60分钟跑完不崩

🟡 第2阶段（5–8周）进入比赛配速

✅ 第5周

	•	A：5.2 mph × 40 min
	•	B：6.2 mph × 8 min × 2（中间走3分钟）
（心率过高、调整课表）
	•	C：4.8 mph × 65 min

✅ 第6周

	•	A：4.8 mph × 50 min
	•	B：6.2 mph × 10 min × 2 （中间慢跑3分钟）（4.5–4.8 mph）
	•	C：4.8 mph × 70 min

✅ 第7周

	•	A：5.0 mph × 50 min
	•	B：6.2 mph × 10 min × 3（中间慢跑3分钟）（4.5–4.8 mph）
	•	C：70 min（最后15分钟 5.8 mph）

✅ 第8周

	•	A：5.0 mph × 45 min
	•	B：6.2 mph × 20 min 连续
	•	C：75 min（最后15分钟 6.0 mph）

🎯 目标：连续 20 分钟 6.2 mph 不爆

🔴 第3阶段（9–11周）冲刺能力

✅ 第9周

	•	A：5.0 mph × 45 min
	•	B：6.4 mph × 5 min × 4（中间慢跑3分钟）（4.5–4.8 mph）
	•	C：75 min（最后15分钟 6.0 mph）

✅ 第10周

	•	A：5.0 mph × 45 min
	•	B：6.2 mph × 20 min + 6.4 mph × 5 min
	•	C：75 min（最后15分钟 6.0 mph）

✅ 第11周（巅峰周）

	•	A：5.0 mph × 40 min
	•	B：6.2 mph × 25 min（连续）
	•	C：70 min（最后20分钟 6.0 mph）

🎯 如果这周完成，你已经具备 <60 能力

🏁 第12周（减量）

	•	A：4.8 mph × 40 min
	•	B：6.2 mph × 15 min
	•	比赛：10km"""
maybe just text
combine these 2 to send to LLM, to let it anaylize my complete state and give suggestion for my training
maybe use chatGPT using the api-key in the keys folder.
make it brief, that everytime i enter a new data or review my training, i can have a good idea of current status, get a suggestion easy to adapt, that easily the steps like asking coach, avoid injury, max the ability gain, without manual input a lot of things or read a long suggestion to know what to do next.


