import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult, NotFoundError
} from "./IInsightFacade";
import DataBase from "../controller/model/DataBase";
import * as fs from "fs-extra";
import JSZip from "jszip";
import Section from "../controller/model/Section";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private dataBases: DataBase[] = [];
	constructor() {
		// if (fs.existsSync("./jsonFiles/databases.json")) {
		// 	this.dataBases = JSON.parse(fs.readFileSync("./jsonFiles/databases.json").toString());
		// } else {
		// 	fs.createFileSync("./jsonFiles/databases.json");
		// }
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id.includes("_")) {
			return Promise.reject(new InsightError("id of the database should not contain underscore"));
		} else if (this.onlySpace(id)) {
			return Promise.reject(new InsightError("id of the database should not be only whitespace characters"));
		} else if (this.idDuplicate(id)) {
			return Promise.reject(new InsightError("id of the database is already existed"));
		} else {
			if (kind === InsightDatasetKind.Sections) {
				const sections: Section[] = [];
				return this.parse(content)
					.then((infoArray) => {
						infoArray.forEach(function (s) {
							const info: any[] = JSON.parse(s).result;
							if (info.length > 0) {
								info.forEach(function (section) {
									sections.push(new Section(section.id, section.Course, section.Title
										, section.Professor
										, section.Subject, section.Year, section.Avg, section.Pass
										, section.Fail, section.Audit));
								});
							}
						});
						this.dataBases.push(new DataBase(id, sections));
						// this.writeDataBasesInLocalDisk(this.dataBases);
						return this.listIDs();
					})
					.catch((err) => {
						return Promise.reject(new InsightError("error occurred in adding stage"));
					});
			} else if (kind === InsightDatasetKind.Rooms) {
				return Promise.reject(new InsightError("not implemented yet"));
			} else {
				return Promise.reject(new InsightError("kind of the database is not valid"));
			}
		}
	}

	public listDatasets(): Promise<InsightDataset[]> {
		const res: InsightDataset[] = [];
		this.dataBases.forEach(function (database) {
			res.push({
				id: database.getId(),
				kind: InsightDatasetKind.Sections,
				numRows: database.getList().length
			});
		});
		return Promise.resolve(res);
	}

	public removeDataset(id: string): Promise<string> {
		if (id.includes("_")) {
			return Promise.reject(new InsightError("id of the database should not contain underscore"));
		} else if (this.onlySpace(id)) {
			return Promise.reject(new InsightError("id of the database should not be only whitespace characters"));
		} else {
			for (let i = 0; i < this.dataBases.length; i++) {
				if (this.dataBases[i].getId() === id) {
					this.dataBases.splice(i, 1);
					// this.writeDataBasesInLocalDisk(this.dataBases);
					return Promise.resolve(id);
				}
			}
		}
		return Promise.reject(new NotFoundError("Cannot find the dataBase"));
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		let database: any[] = [];
		if (!query){
			return Promise.reject(new InsightError("Query is undefined/null/empty"));
		}else if (this.dataBases.length === 0) {
			return Promise.reject(new InsightError("No datasets in the facade"));

		}
		try {
			const databaseID: string = this.findDatabaseID(query);
			for (const data of this.dataBases) {
				if (data._id === databaseID) {
					database = data._list;
					break;
				}
			}
			if (database.length === 0) {
				throw new InsightError("Cannot find the dataset");
			}
			database = this.queryProcessor(query, databaseID, database);
		} catch (e) {
			return Promise.reject(e);
		}

		return Promise.resolve(database);
	}

	private listIDs(): string[] {
		const res: string[] = [];
		this.dataBases.forEach(function (da) {
			res.push(da.getId());
		});
		return res;
	}

	private onlySpace(id: string) {
		for (const char of id) {
			if (char !== " ") {
				return false;
			}
		}
		return true;
	}

	private idDuplicate(id: string) {
		for (const dataBase of this.dataBases) {
			if (dataBase._id === id) {
				return true;
			}
		}
		return false;
	}

	private async parse(content: string): Promise<string[]> {
		const coursesArray: any[] = [];
		try {
			const zip = await new JSZip().loadAsync(content, {base64: true});
			zip.folder("courses/")?.forEach((path, file) => {
				coursesArray.push(file.async("string"));
			});
		} catch (e: any) {
			return Promise.reject(new InsightError("error occurred in parsing stage: " + e.getMessage()));
		}
		return Promise.all(coursesArray);

	}

	private queryProcessor(query: any, id: string, res: any[]) {
		if (Object.keys(query).length !== 2) {
			throw new InsightError("Invalid query");
		}
		for (const [key, value] of Object.entries(query)) {
			if (key === "WHERE") {
				res = this.handleWhere(value, id, res);
				this.renameKeys(id, res);
			} else if (key === "OPTIONS") {
				res = this.handleOptions(value, res);
			} else {
				throw new InsightError("Invalid query");
			}
		}
		return res;
	}

	private handleWhere(whereBody: any, id: string, res: any[]) {
		if (Object.keys(whereBody).length !== 1) {
			throw new InsightError("Wrong keys in WHERE clause");
		}
		for (const [key, value] of Object.entries(whereBody)) {
			if (key === "IS") {
				res = this.handleIS(id, value, res);
			} else if (key === "NOT") {
				this.notComparator("NOT", value);
			}else if (key === "AND" || key === "OR") {
				this.logicComparator(key, value);
			} else if (key === "EQ" || key === "GT" || key === "LT") {
				res = this.handleMComparator(key, value, id, res);
			} else {
				throw new InsightError("Wrong keys in WHERE clause");

			}
		}
		return res;
	}

	private handleIS(id: string, isBody: any, res: any[]) {
		const validFields: string[] = ["dept","id","instructor","title","uuid"];
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
			return res.filter((data) => data[keyContents[1]] === String(value));
		}
		throw new InsightError("Should not reject");
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
		throw new InsightError("Should not reject");

	}

	private handleOptions(optionsBody: any, res: any[]) {
		if (Object.keys(optionsBody).length !== 1 && Object.keys(optionsBody).length !== 2) {
			throw new InsightError("Wrong keys in WHERE clause");
		}
		if (Object.keys(optionsBody).length === 1 ){
			return this.handleColumns("COLUMNS", optionsBody["COLUMNS"], res);
		}else if (Object.keys(optionsBody).length === 2){
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

	private writeDataBasesInLocalDisk(dataBases: DataBase[]) {
		fs.writeFileSync("./jsonFiles/databases.json", JSON.stringify(dataBases));
	}

	private findDatabaseID(query: any) {
		const columns: string[] = query["OPTIONS"]["COLUMNS"];
		if (columns === undefined) {
			throw new InsightError("Invalid query");
		} else {
			const id: string = columns[0].split("_", 1)[0];
			for (const s of columns) {
				if (id !== s.split("_", 1)[0]) {
					throw new InsightError("Cannot query more than one dataset");
				}
			}
			return id;
		}
	}

	private renameKeys(id: string, res: any[]) {
		res.map((data) => {
			for (const [key, value] of Object.entries(data)) {
				Object.assign(data, {[id + "_" + key]: data[key]});
				delete data[key];
			}
		});
	}
}
