import {InsightDataset, InsightError} from "../IInsightFacade";

export class InsightFacadeHelpers {

	protected handleWhere(whereBody: any, id: string, res: any[]) {
		if (Object.keys(whereBody).length !== 1) {
			throw new InsightError("Wrong keys in WHERE clause");
		}
		for (const [key, value] of Object.entries(whereBody)) {
			if (key === "IS") {
				res = this.handleIS(id, value, res);
			} else if (key === "NOT") {
				// this.notComparator("NOT", value);
				throw new InsightError("Not implemented");
			} else if (key === "AND" || key === "OR") {
				// this.logicComparator(key, value);
				throw new InsightError("Not implemented");
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

	private notComparator(comparator: any, whereBody: any) {
		return undefined;
	}

	private logicComparator(comparator: any, whereBody: any) {
		return undefined;
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
						break;
					case "GT":
						return res.filter((data) => data[keyContents[1]] > Number(value));
						break;
					case "LT":
						return res.filter((data) => data[keyContents[1]] < Number(value));
						break;
				}
			}
		}
		throw new InsightError("Invalid filter type");

	}

	protected handleOptions(optionsBody: any, res: any[]) {
		if (Object.keys(optionsBody).length !== 1 && Object.keys(optionsBody).length !== 2) {
			throw new InsightError("Wrong keys in WHERE clause");
		}
		if (Object.keys(optionsBody).length === 1) {
			return this.handleColumns("COLUMNS", optionsBody["COLUMNS"], res);
		} else if (Object.keys(optionsBody).length === 2) {
			this.handleColumns("COLUMNS", optionsBody["COLUMNS"], res);
			this.handleOrder("ORDER", optionsBody["ORDER"], res);
		}
		return res;
	}

	private handleColumns(columns: string, columnsBody: any, res: any[]): InsightDataset[] {
		res.map((data) => {
			for (const [key, value] of Object.entries(data)) {
				if (!columnsBody.includes(key)) {
					delete data[key];
				}
			}
		});
		return res;
	}

	private handleOrder(order: string, orderBody: any, res: any[]) {
		return res;
	}
}
