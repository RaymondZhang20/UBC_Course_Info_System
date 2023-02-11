import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import DataBase from "../controller/model/DataBase";
import * as fs from "fs-extra";
import JSZip from "jszip";
import Section from "../controller/model/Section";
import {InsightFacadeHelpers} from "./model/QueryHandlers";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade extends InsightFacadeHelpers implements IInsightFacade {
	private dataBases: DataBase[] = [];
	constructor() {
		super();
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
									if (section.Section === "overall") {
										sections.push(new Section(String(section.id), section.Course, section.Title
											, section.Professor
											, section.Subject, 1900, section.Avg, section.Pass
											, section.Fail, section.Audit));
									} else {
										sections.push(new Section(String(section.id), section.Course, section.Title
											, section.Professor
											, section.Subject, Number(section.Year), section.Avg, section.Pass
											, section.Fail, section.Audit));
									}
								});
							}
						});
						this.dataBases.push(new DataBase(id, sections));
						// this.writeDataBasesInLocalDisk(this.dataBases);
						return Promise.all(this.listIDs());
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
		}else if (!Object.keys(query).includes("WHERE") || !Object.keys(query).includes("OPTIONS")) {
			return Promise.reject(new InsightError("No WHERE or OPTIONS"));
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
		} else if (Object.keys(query).includes("WHERE")) {
			res = this.handleWhere(id,query["WHERE"], res);
			if (res.length > 5000) {
				throw new ResultTooLargeError("Result larger then 5000");
			} else if (Object.keys(query).includes("OPTIONS")) {
				res = this.handleOptions(id, query["OPTIONS"], res);
			} else {
				throw new InsightError("Cannot find OPTIONS clause");
			}
		} else {
			throw new InsightError("Cannot find WHERE clause");
		}
		return res;
	}

	private writeDataBasesInLocalDisk(dataBases: DataBase[]) {
		fs.writeFileSync("./jsonFiles/databases.json", JSON.stringify(dataBases));
	}

	private findDatabaseID(query: any) {
		const columns: string[] = query["OPTIONS"]["COLUMNS"];
		if (columns === undefined || columns.length < 1) {
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
}
