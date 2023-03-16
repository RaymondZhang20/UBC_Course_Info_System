import {InsightDataset, InsightDatasetKind, InsightError, ResultTooLargeError} from "../IInsightFacade";
import {DatabaseHelpers} from "./DatabaseHelpers";


export class InsightFacadeHelpers extends DatabaseHelpers {

	protected handleWhere(id: string, whereBody: any, res: any[], kind: InsightDatasetKind) {
		if (Object.keys(whereBody).length === 0){
			if (res.length > 5000) {
				throw new ResultTooLargeError("Result larger then 5000");
			}
		}
		if (Array.isArray(whereBody) || Object.keys(whereBody).length !== 1) {
			throw new InsightError("Wrong keys in WHERE clause");
		}
		for (const [key, value] of Object.entries(whereBody)) {
			if (key === "IS") {
				res = this.handleIS(id, value, res, kind);
			} else if (key === "NOT") {
				res = this.handleNOT(id, value, res, kind);
			} else if (key === "AND") {
				res = this.handleAND(id, value, res, kind);
			} else if (key === "OR") {
				res = this.handleOR(id, value, res, kind);
			} else if (key === "EQ" || key === "GT" || key === "LT") {
				res = this.handleMComparator(key, value, id, res, kind);
			} else {
				throw new InsightError("Wrong keys in WHERE clause");
			}
		}
		return res;
	}

	private handleIS(id: string, isBody: any, res: any[], kind: InsightDatasetKind) {
		if (Object.keys(isBody).length !== 1) {
			throw new InsightError("Wrong keys in math operator");
		}
		let validFields: string[] = [];
		if (kind === InsightDatasetKind.Sections) {
			validFields = ["dept", "id", "instructor", "title", "uuid"];
		} else if (kind === InsightDatasetKind.Rooms) {
			validFields = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
		}
		function inputStringHelper(inputString: string, keyContents: string[], fn: (searchString: string) => boolean) {
			if (!inputString.includes("*")) {
				return res.filter((data) => data[keyContents[1]].fn);
			} else {
				throw new InsightError("Asterisks (*) cannot be in the middle of input strings");
			}
		}
		for (const [key, value] of Object.entries(isBody)) {
			const keyContents: string[] = key.split("_", 2);
			if (keyContents[0] !== id) {
				throw new InsightError("Cannot query more than one dataset");
			}
			if (!validFields.includes(keyContents[1])) {
				throw new InsightError("Invalid field");
			}
			if ((typeof value) === "string") {
				const val = String(value);
				let inputString = "";
				if (!val.includes("*")) {
					return res.filter((data) => data[keyContents[1]] === val);
				} else if (val.charAt(0) === "*" && val.charAt(val.length - 1) !== "*") {
					inputString = val.substring(1);
					return inputStringHelper(inputString, keyContents, (s) => s.endsWith(inputString));
				} else if (val.charAt(0) !== "*" && val.charAt(val.length - 1) === "*") {
					inputString = val.substring(0, val.length - 1);
					return inputStringHelper(inputString, keyContents, (s) => s.startsWith(inputString));
				} else if (val.charAt(0) === "*" && val.charAt(val.length - 1) === "*") {
					inputString = val.substring(1, val.length - 1);
					return inputStringHelper(inputString, keyContents, (s) => s.includes(inputString));
				}
			}
		}
		throw new InsightError("Invalid filter type");
	}

	private handleNOT(id: string, body: any, res: any[], kind: InsightDatasetKind) {
		const all: any[] = res;
		const not: any[] = this.handleWhere(id, body, res, kind);
		return all.filter((data) => !not.includes(data));
	}

	private handleAND(id: string, body: any, res: any[], kind: InsightDatasetKind) {
		if (!Array.isArray(body) || body.length < 1) {
			throw new InsightError("Should be an non-empty array inside AND");
		}
		let res1: any[] = this.handleWhere(id, body[0], res, kind);
		let res2: any[] = res1;
		for (let i = 1; i < body.length; i++) {
			res1 = this.handleWhere(id, body[i], res, kind);
			res2 = res1.filter((data) => res2.includes(data));
		}
		return res2;
	}

	private handleOR(id: string, body: any, res: any[], kind: InsightDatasetKind) {
		if (!Array.isArray(body) || body.length < 1) {
			throw new InsightError("Should be an non-empty array inside OR");
		}
		let res1: any[] = this.handleWhere(id, body[0], res, kind);
		let res2: any[] = res1;
		for (let i = 1; i < body.length; i++) {
			res1 = this.handleWhere(id, body[i], res, kind);
			res2 = [...new Set([...res2, ...res1])];
		}
		return res2;
	}

	private handleMComparator(comparator: string, content: any, id: string, res: any[], kind: InsightDatasetKind) {
		let validFields: string[] = [];
		if (kind === InsightDatasetKind.Sections){
			validFields = ["avg", "pass", "fail", "audit", "year"];
		} else if (kind === InsightDatasetKind.Rooms){
			validFields = ["lat", "lon", "seats"];
		}
		if (Object.keys(content).length !== 1) {
			throw new InsightError("Wrong keys in math operator");
		}
		for (const [key, value] of Object.entries(content)) {
			const keyContents: string[] = key.split("_", 2);
			if (keyContents[0] !== id) {
				throw new InsightError("Cannot query more than one dataset");
			}
			if (!validFields.includes(keyContents[1])) {
				throw new InsightError("Invalid field");
			}
			if ((typeof value) === "number") {
				switch (comparator) {
					case "EQ":
						return res.filter((data) => data[keyContents[1]] === Number(value));
					case "GT":
						return res.filter((data) => data[keyContents[1]] > Number(value));
					case "LT":
						return res.filter((data) => data[keyContents[1]] < Number(value));
				}
			}
		}
		throw new InsightError("Invalid filter type");

	}

	protected handleOptions(id: string, optionsBody: any, res: any[]) {
		if (Object.keys(optionsBody).length === 1 && (Object.keys(optionsBody).includes("COLUMNS"))) {
			return this.handleColumns(id, optionsBody["COLUMNS"], res);
		} else if (Object.keys(optionsBody).length === 2 && (Object.keys(optionsBody).includes("COLUMNS")) &&
			(Object.keys(optionsBody).includes("ORDER"))) {
			res = this.handleColumns(id, optionsBody["COLUMNS"], res);
			return this.handleOrder(optionsBody["ORDER"], optionsBody["COLUMNS"], res);
		} else {
			throw new InsightError("Wrong keys in Options clause");
		}
	}

	private handleColumns(id: string, columnsBody: any, res: any[]): InsightDataset[] {
		if (!Array.isArray(columnsBody) || columnsBody.length < 1) {
			throw new InsightError("COLUMNS must be a non-empty array");
		}
		if (res.length === 0){
			return res;
		}
		return res.map((data) => {
			let newData: any = {};
			for (const column of columnsBody) {
				if (Object.keys(data).includes(column)) {
					Object.assign(newData, {[column]: data[column]});
				} else {
					throw new InsightError("Invalid columns");
				}
			}
			return newData;
		});
	}

	private handleOrder(orderBody: any, optionsBody: any, res: any[]) {
		if (typeof orderBody === "string") {
			if (!optionsBody.includes(orderBody)){
				throw new InsightError("ORDER key must be in COLUMNS");
			}
			return res.sort((a, b) => {
				if (a[orderBody] > b[orderBody]) {
					return 1;
				}else {
					return -1;
				}
			});
		} else if (typeof orderBody === "object" && Object.keys(orderBody).length === 2 &&
			(Object.keys(orderBody).includes("dir")) && (Object.keys(orderBody).includes("keys"))) {
			let dir: number = 0;
			if (orderBody["dir"] === "UP") {
				dir = 1;
			} else if (orderBody["dir"] === "DOWN") {
				dir = -1;
			} else {
				throw new InsightError("dir must be UP or DOWN");
			}
			if (!Array.isArray(orderBody["keys"])) {
				throw new InsightError("keys must be an array");
			}
			return res.sort((a, b) => {
				if (this.compare(a,b,orderBody["keys"])) {
					return dir;
				} else {
					return -dir;
				}
			});
		} else {
			throw new InsightError("SORT is not in the right format");
		}
	}

	private compare(a: any, b: any, keys: any[]): boolean {
		for (let key of keys) {
			if (a[key] !== b[key]) {
				return a[key] > b[key];
			}
		}
		return false;
	}

	protected handleTrans(id: string, transBody: any, res: any[]) {
		if (Object.keys(transBody).length !== 2) {
			throw new InsightError("Invalid number of arguments in TRANSFORMATIONS");
		}
		if (!Object.keys(transBody).includes("GROUP") || !Object.keys(transBody).includes("APPLY")) {
			throw new InsightError("Missing GROUP or APPLY in TRANSFORMATIONS");
		}
		res = this.handleGroup(id, transBody["GROUP"], res);
		res = this.handleApply(id, transBody["APPLY"], res, transBody["GROUP"]);
		return res;
	}

	private handleGroup(id: string, groupBody: any, res: any[]) {
		if (res.length === 0) {
			return res;
		}
		if (!Array.isArray(groupBody) || groupBody.length === 0) {
			throw new InsightError("GROUP must be an non-empty array");
		}
		const newRes: any[][] = [];
		for (const data of res) {
			if (newRes.length === 0) {
				newRes.push([data]);
			} else {
				let count: number = 0;
				let added: boolean = false;
				for (const group of newRes) {
					for (const groupCol of groupBody) {
						if (data[groupCol] === undefined) {
							throw new InsightError("Catch you !!!");
						}
						if (group[0][groupCol] === data[groupCol]) {
							count++;
						}
					}
					if (count === groupBody.length) {
						group.push(data);
						added = true;
						break;
					}
					count = 0;
				}
				if (!added) {
					newRes.push([data]);
				}
			}
		}
		return newRes;
	}

	private handleApply(id: string, applyBody: any, res: any[], groupColumns: any[]) {
		if (!Array.isArray(applyBody)) {
			throw new InsightError("Apply must be an array");
		}
		const newRes: any[] = [];
		for (const group of res) {
			const data: any = {};
			for (const groupCol of groupColumns) {
				data[groupCol] = group[0][groupCol];
			}
			if (applyBody.length > 0) {
				for (const apply of applyBody) {
					if (Object.keys(apply).length !== 1) {
						throw new InsightError("Apply rule can only have one key");
					}
					if (Object.keys(apply)[0].includes("_")) {
						throw new InsightError("Apply name cannot contain underscore");
					}
					data[Object.keys(apply)[0]] = this.getAggregation(group, apply[Object.keys(apply)[0]]);
				}
			}
			newRes.push(data);
		}
		return newRes;
	}
}
