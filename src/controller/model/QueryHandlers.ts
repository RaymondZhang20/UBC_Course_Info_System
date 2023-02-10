import {InsightDataset, InsightError} from "../IInsightFacade";


export class InsightFacadeHelpers {

	protected handleWhere(id: string, whereBody: any, res: any[]) {
		if (Object.keys(whereBody).length !== 1) {
			throw new InsightError("Wrong keys in WHERE clause");
		}
		for (const [key, value] of Object.entries(whereBody)) {
			if (key === "IS") {
				res = this.handleIS(id, value, res);
			} else if (key === "NOT") {
				res = this.handleNOT(id, value, res);
			} else if (key === "AND") {
				res = this.handleAND(id, value, res);
			} else if (key === "OR") {
				res = this.handleOR(id, value, res);
			} else if (key === "EQ" || key === "GT" || key === "LT") {
				res = this.handleMComparator(key, value, id, res);
			} else {
				throw new InsightError("Wrong keys in WHERE clause");

			}
		}
		return res;
	}

	private handleIS(id: string, isBody: any, res: any[]) {
		const validFields: string[] = ["dept", "id", "instructor", "title", "uuid"];
		if (Object.keys(isBody).length !== 1) {
			throw new InsightError("Wrong keys in math operator");
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
				return res.filter((data) => data[keyContents[1]] === String(value));
			}
		}
		throw new InsightError("Invalid filter type");
	}

	private handleNOT(id: string, body: any, res: any[]) {
		const all: any[] = res;
		const not: any[] = this.handleWhere(id, body, res);
		return all.filter((data) => !not.includes(data));
	}

	private handleAND(id: string, body: any, res: any[]) {
		let res1: any[] = this.handleWhere(id, body[0], res);
		let res2: any[] = res1;
		for (let i = 1; i < body.length; i++) {
			res1 = this.handleWhere(id, body[i], res);
			res2 = res1.filter((data) => res2.includes(data));
		}
		return res2;
	}

	private handleOR(id: string, body: any, res: any[]) {
		let res1: any[] = this.handleWhere(id, body[0], res);
		let res2: any[] = res1;
		for (let i = 1; i < body.length; i++) {
			res1 = this.handleWhere(id, body[i], res);
			res2 = [...res1, ...res2];
		}
		return res2;
	}

	private handleMComparator(comparator: string, content: any, id: string, res: any[]) {
		const validFields: string[] = ["avg", "pass", "fail", "audit", "year"];
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
			return this.handleOrder(optionsBody["ORDER"], res);
		} else {
			throw new InsightError("Wrong keys in WHERE clause");
		}
	}

	private handleColumns(id: string, columnsBody: any, res: any[]): InsightDataset[] {
		if (res.length === 0){
			return res;
		}
		res.map((data) => {
			for (const column of columnsBody) {
				const splitColumn: string[] = column.split("_", 2);
				if (splitColumn[0] !== id) {
					throw new InsightError("Cannot query more than one database");
				} else if (Object.keys(data).includes(splitColumn[1])) {
					Object.assign(data, {[column]: data[splitColumn[1]]});
				} else {
					throw new InsightError("Invalid columns");
				}
			}
			for (const [key, value] of Object.entries(data)) {
				if (!key.includes("_")) {
					delete data[key];
				}
			}
		});
		return res;
	}

	private handleOrder(orderBody: any, res: any[]) {
		return res.sort((a, b) => (a[orderBody] > b[orderBody]) ? 1 : -1);
	}
}
