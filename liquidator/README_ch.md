suilend-public/liquidator

这是 Suilend 社区构建自己的清算机器人（liquidator bots）的起点。
运行 docker-compose up -d --build 即可启动清算程序。
你必须先将你的私钥添加到 docker-compose.yml 文件的环境变量中。

⸻

清算器由两个组件组成，它们通过 Redis 通信：
	•	Dispatcher（调度器）：负责查找符合清算条件的 obligation（债务），并将其发布到 Redis 的一个键中。
	•	Worker（工作线程）：监听该 Redis 键，尝试对其中的 obligation 进行清算。

⸻

可能的扩展与改进：
	1.	并发清算：
当前只能同时进行一次清算。你可以添加另一个使用不同钱包的 worker 进程来并行清算。Dispatcher 可以选择发布到多个 Redis 键中，为不同的 worker 服务。
	2.	清算顺序：
当前清算任务是随机顺序执行的 —— Redis 中读取的 obligation ID 会被打乱（shuffle）后依序处理。理论上，更优的做法是优先处理价值更高或更容易被清算的仓位。
	3.	obligation 数据传递：
目前通过 Redis 传递的只有 obligation ID，因此 worker 必须重新获取 obligation 数据并刷新它，才能尝试清算。如果能将 obligation 的序列化数据一起传递给 Redis，可能会提高效率，避免重复工作。
	4.	清算重试逻辑：
当前 worker 会在固定时间内尝试清算，如果失败就放弃并转向下一个。这个逻辑可以更智能化，例如根据失败原因动态调整等待或重试机制。
	5.	清算是否盈利：
清算程序目前不会判断每笔清算是否真正盈利。如果使用的去中心化交易所（如 Cetus）滑点太大，可能会导致亏损。应当考虑加入盈利性检查。
	6.	多交易场所支持：
当前资产只在一个交易场所（venue）抛售，如果该场所流动性不足可能会导致失败。可以扩展支持多个交易场所，提高成功率。
	7.	交易拆分优化：
当前清算和资产兑换是在同一个交易中进行的。然而，如果交易涉及太多账户，可能导致交易更容易失败。将清算和兑换交易拆分可能在某些情况下会更容易成功。




看了代码后觉得可以添加的优化：

1.
tryLiquidatePosition （liquidator.ts）采用了pbt的方式，但是在如上5的情况下，有可能亏损。我现在能想到的一个优化是，在现有逻辑外层，加一个move 合约wrapper，revert(assert!)掉不盈利的情况。

2.
flashloan在某些地方是否可以利用？


3.
swap或者liquidate之前，wallet里钱不够的情况？
