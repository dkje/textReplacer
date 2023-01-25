const getLiItem = ({ innerText, closeEventHandler }) => {
	const $li = document.createElement("li");
	$li.innerText = innerText;
	const $removeLiBtn = document.createElement("button");
	$removeLiBtn.innerText = "x";
	$removeLiBtn.className = "btn_sm";
	$removeLiBtn.addEventListener("click", closeEventHandler);
	$li.appendChild($removeLiBtn);
	return $li;
};
const getNoItemMsg = (text) => {
	const $message = document.createElement("span");
	$message.className = "info_text";
	$message.innerText = text;
	return $message;
};

const initTextListListener = () => {
	let storage = chrome.storage;

	const loadList = async () => {
		const items = await getItems();
		const $list = document.getElementById("saved_list");
		$list.innerHTML = "";

		if (items.length) {
			const getItem = ({ removeText, newText, id }) => {
				return getLiItem({
					innerText: `${removeText} => ${newText}`,
					closeEventHandler: () => removeItem(id),
				});
			};
			$list.append(...items.map(getItem));
		} else {
			$list.appendChild(getNoItemMsg("no settings saved"));
		}
	};

	const getItems = async () => {
		let { items } = (await storage.sync.get("items")) || { items: [] };
		if (!Array.isArray(items)) {
			return [];
		}
		return items;
	};

	const clearItemAll = () => {
		storage.sync.set({ items: [] });
	};

	const saveItem = async ({ newText, removeText }) => {
		if (!newText || !removeText) {
			alert("Please enter a value to save");
			return;
		}

		const items = await getItems();
		const alreadyAdded = items.some((el) => {
			return el.removeText === removeText;
		});

		if (alreadyAdded) {
			alert("Replace Target already saved.");
			return;
		}

		items.push({ newText, removeText, id: Date.now() });
		storage.sync.set({ items });
		return true;
	};

	const removeItem = async (removeId) => {
		let items = await getItems();
		items = items.filter(({ id }) => id !== removeId);
		storage.sync.set({ items });
	};

	const addBtnEventHandler = () => {
		const $addBtn = document.getElementById("add_btn");
		$addBtn.addEventListener("click", async (e) => {
			e.stopPropagation();
			const $removeText = document.getElementById("remove_text");
			const $newText = document.getElementById("new_text");
			const ok = await saveItem({
				removeText: $removeText.value,
				newText: $newText.value,
			});
			if (ok) {
				$removeText.value = "";
				$newText.value = "";
			}
		});

		const $removeAllBtn = document.getElementById("remove_all_btn");
		$removeAllBtn.addEventListener("click", () => {
			clearItemAll();
		});
	};

	const addStorageEventHandler = () => {
		storage.onChanged.addListener(loadList);
	};

	const init = () => {
		addBtnEventHandler();
		addStorageEventHandler();
		loadList();
	};

	init();
};

const initSettingListener = () => {
	let storage = chrome.storage;

	const getMatches = async () => {
		let { matches } = (await storage.sync.get("matches")) || { matches: [] };
		if (!Array.isArray(matches)) {
			return [];
		}
		return matches;
	};

	const addNewMatches = async (newHost) => {
		const matches = await getMatches();
		if (matches.includes(newHost)) {
			alert("Already added page");
			return;
		}
		matches.push(newHost);
		storage.sync.set({ matches });
	};

	const removeMatches = async (host) => {
		let matches = await getMatches();
		matches = matches.filter((el) => el !== host);
		storage.sync.set({ matches });
	};

	const deleteAllMatches = () => {
		storage.sync.set({ matches: [] });
	};

	const loadMatchesList = async () => {
		const $list = document.getElementById("matches_list");
		$list.innerHTML = "";
		const matches = await getMatches();

		if (matches.length) {
			const getItem = (match) => {
				return getLiItem({
					innerText: match,
					closeEventHandler: () => removeMatches(match),
				});
			};
			$list.append(...matches.map(getItem));
		} else {
			$list.appendChild(getNoItemMsg("no page enabled"));
		}
	};

	const addMatchEventHandler = () => {
		const $addBtn = document.getElementById("add_this_page_btn");
		$addBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			const $input = document.getElementById("host_input");
			if ($input.value) {
				addNewMatches($input.value);
			} else {
				alert("plz add page url");
			}
		});

		const $clearAllMatch = document.getElementById("clear_all_match_btn");
		$clearAllMatch.addEventListener("click", deleteAllMatches);
	};

	const init = () => {
		loadMatchesList();
		addMatchEventHandler();
	};

	storage.onChanged.addListener(loadMatchesList);
	init();
};

const initActiveListener = () => {
	const $activeBtn = document.getElementById("always_active_btn");

	chrome.storage.sync.get("alwaysActive", ({ alwaysActive = false }) => {
		$activeBtn.checked = alwaysActive;
	});

	$activeBtn.addEventListener("change", (e) => {
		chrome.storage.sync.set({ alwaysActive: $activeBtn.checked });
	});
};

const initActiveBtn = () => {
	const $activeBtn = document.getElementById("visible_active_btn");

	chrome.storage.sync.get(
		"avtiveBtnVisible",
		({ avtiveBtnVisible = false }) => {
			$activeBtn.checked = avtiveBtnVisible;
		}
	);

	$activeBtn.addEventListener("change", (e) => {
		chrome.storage.sync.set({ avtiveBtnVisible: $activeBtn.checked });
	});
};

const initExportImportSetting = () => {
	const onClickImport = () => {
		const getFileInput = (onSelectFile) => {
			const $input = document.createElement("input");
			$input.type = "file";
			$input.accept = ".json";
			$input.addEventListener("change", onSelectFile);
			return $input;
		};

		const saveWithMerge = async (importedSetting) => {
			const originalSetting = await chrome.storage.sync.get(null);

			const items = [
				...(originalSetting.items || []),
				...(importedSetting.items || []),
			].reduce((acc, cur) => {
				const conflict = acc.some(
					({ removeText }) => cur.removeText === removeText
				);
				if (!conflict) acc.push(cur);
				return acc;
			}, []);

			const matches = [
				...new Set([
					...(originalSetting.matches || []),
					...(importedSetting.matches || []),
				]),
			];
			const avtiveBtnVisible =
				originalSetting.avtiveBtnVisible || importedSetting.avtiveBtnVisible;

			const result = {
				avtiveBtnVisible,
				items,
				matches,
			};

			chrome.storage.sync.set(result);
		};

		const fileHandler = async (e) => {
			const fileToJSON = (file) => {
				const reader = new FileReader();
				reader.onload = () => {
					saveWithMerge(JSON.parse(reader.result));
				};
				reader.readAsText(file);
			};
			const file = await e.target.files[0];
			fileToJSON(file);
		};

		const $input = getFileInput(fileHandler);
		$input.click();
	};

	const onClickExport = async () => {
		const getSettingFile = async () => {
			const settingData = await chrome.storage.sync.get(null);
			const blob = new Blob([JSON.stringify(settingData)], {
				type: "text/json",
			});
			return blob;
		};

		const getLinkDom = (blob, filename) => {
			const link = document.createElement("a");
			link.download = filename;
			link.href = window.URL.createObjectURL(blob);
			link.dataset.downloadurl = ["text/json", link.download, link.href].join(
				":"
			);
			return link;
		};

		const file = await getSettingFile();
		const $link = getLinkDom(file, "text_replacer_setting.json");

		$link.dispatchEvent(
			new MouseEvent("click", {
				view: window,
				bubbles: true,
				cancelable: true,
			})
		);
		$link.remove();
		alert("설정 파일이 다운로드 됐습니다");
	};

	const $exportBtn = document.getElementById("export_btn");
	console.log($exportBtn);
	$exportBtn.addEventListener("click", onClickExport);
	const $import_btn = document.getElementById("import_btn");
	$import_btn.addEventListener("click", onClickImport);
};

initActiveListener();
initActiveBtn();
initTextListListener();
initSettingListener();
initExportImportSetting();
