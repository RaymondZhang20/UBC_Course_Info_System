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
		if (kind === InsightDatasetKind.Sections){
			validFields = ["dept", "id", "instructor", "title", "uuid"];
		}else if (kind === InsightDatasetKind.Rooms){
			validFields = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
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
				if (!val.includes("*")) {
					return res.filter((data) => data[keyContents[1]] === val);
				}else if (val.charAt(0) === "*" && val.charAt(val.length - 1) !== "*"){
					return res.filter((data) => data[keyContents[1]].endsWith(val.replace(/\*/gi,"")));
				}else if(val.charAt(0) !== "*" && val.charAt(val.length - 1) === "*"){
					return res.filter((data) => data[keyContents[1]].startsWith(val.replace(/\*/gi,"")));
				}else if(val.charAt(0) === "*" && val.charAt(val.length - 1) === "*"){
					return res.filter((data) => data[keyContents[1]].includes(val.replace(/\*/gi,"")));
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
				const splitColumn: string[] = column.split("_", 2);
				if (splitColumn[0] !== id) {
					throw new InsightError("Cannot query more than one database");
				} else if (Object.keys(data).includes(splitColumn[1])) {
					Object.assign(newData, {[column]: data[splitColumn[1]]});
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
		if (Object.keys(transBody).length !== 2){
			throw new InsightError("Invalid number of arguments in TRANSFORMATIONS");
		}
		if (!Object.keys(transBody).includes("GROUP") || !Object.keys(transBody).includes("APPLY")) {
			throw new InsightError("Missing GROUP or APPLY in TRANSFORMATIONS");
		}
		if (Object.keys(transBody).length === 2 && Object.keys(transBody).includes("GROUP")
			&& Object.keys(transBody).includes("APPLY")){
			res = this.handleGroup(id, transBody["GROUP"], res);
			return this.handleApply(id, transBody["APPLY"], res);
		}
	}

	private handleGroup(id: string, groupBody: any, res: any[]) {
		return res;
	}

	private handleApply(id: string, applyBody: any, res: any[]) {
		return res;
	}
}
