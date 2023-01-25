const setObserver = (targetDom, eventHandler) => {
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((records) => {
			records.addedNodes.forEach(eventHandler);
		});
	});
	observer.observe(targetDom, {
		childList: true,
		subtree: true,
		attributes: false,
		characterData: false,
	});
};

const runReplace = () => {
	let storage = chrome.storage;

	const getItems = async () => {
		let { items } = (await storage.sync.get("items")) || { items: [] };
		if (!Array.isArray(items)) {
			return [];
		}
		return items;
	};

	const replace = async (node) => {
		if (node.nodeName === "IFRAME") {
			const target =
				node.contentWindow.document.getElementsByTagName("body")[0];
			setObserver(target, replace);
			replace(target);
		}

		const items = await getItems();
		const matchText = items.map(({ removeText }) => removeText).join("|");
		const findRegex = new RegExp(matchText);
		const matched = node.innerText?.match(findRegex);

		if (!matched) return;

		const findNode = (node) => {
			if (node.nodeName === "#text") {
				let text = node.textContent;
				items.forEach(({ newText, removeText }) => {
					text = text.replaceAll(removeText, newText);
				});
				node.textContent = text;
			}
			if (node.childNodes.length) {
				node.childNodes.forEach((n) => findNode(n));
			}
		};

		findNode(node);
	};

	replace(document.body);
};

const addActiveBtn = () => {
	const $replacerBtn = document.createElement("button");
	$replacerBtn.innerHTML = "텍스트 치환";
	$replacerBtn.style.position = "fixed";
	$replacerBtn.style.bottom = "10px";
	$replacerBtn.style.right = "10px";
	$replacerBtn.style.cursor = "pointer";
	$replacerBtn.addEventListener("click", runReplace);
	document.body.append($replacerBtn);
};

const init = async () => {
	let isActive = false;
	const { matches = [] } = await chrome.storage.sync.get("matches");
	const isMatchedURL = matches.some((el) => {
		console.log(window.location.host);
		return window.location.host.includes(el);
	});
	if (isMatchedURL) isActive = true;

	const { alwaysActive = false } = await chrome.storage.sync.get(
		"alwaysActive"
	);
	if (alwaysActive) isActive = true;

	if (isActive) {
		setObserver(document.body, runReplace);
	}

	chrome.storage.sync.get("avtiveBtnVisible", (props) => {
		const { avtiveBtnVisible = "" } = props;
		if (!!avtiveBtnVisible) {
			addActiveBtn();
		}
	});
};

init();
console.log("~~~ text replacer run ~~~");
