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
import {InsightFacadeHelpers} from "./model/FacadeHelpers";
import Room from "./model/Room";
import {parse} from "parse5";
import * as http from "http";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade extends InsightFacadeHelpers implements IInsightFacade {
	private dataBases: DataBase[] = [];
	constructor() {
		super();
		if (fs.existsSync("./data/databases.json")) {
			this.dataBases = JSON.parse(fs.readFileSync("./data/databases.json").toString());
		} else {
			fs.createFileSync("./data/databases.json");
		}
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
				return this.parseSection(content)
					.then((infoArray) => {
						this.loadSections(infoArray, sections);
						if (sections.length === 0) {
							throw new InsightError("empty or invalid zip file");
						}
						this.dataBases.push(new DataBase(id, sections, InsightDatasetKind.Sections));
						this.writeDataBasesInLocalDisk(this.dataBases);
						return Promise.all(this.listIDs());
					})
					.catch((err) => {
						return Promise.reject(new InsightError("error occurred in adding stage" + err.message));
					});
			} else if (kind === InsightDatasetKind.Rooms) {
				const rooms: Room[] = [];
				return this.parseRoom(content)
					.then((infoArray) => {
						this.loadRooms(infoArray, rooms);
						if (rooms.length === 0) {
							throw new InsightError("empty or invalid campus file");
						}
						this.dataBases.push(new DataBase(id, rooms, InsightDatasetKind.Rooms));
						this.writeDataBasesInLocalDisk(this.dataBases);
						return Promise.all(this.listIDs());
					})
					.catch((err) => {
						return Promise.reject(new InsightError("error occurred in adding stage" + err.message));
					});
			} else {
				return Promise.reject(new InsightError("kind of the database is not valid"));
			}
		}
	}

	private loadSections(infoArray: string[], sections: Section[]) {
		infoArray.forEach(function (s) {
			if (s !== "") {
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
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		const res: InsightDataset[] = [];
		this.dataBases.forEach(function (database) {
			res.push({
				id: database._id,
				kind: database._kind,
				numRows: database._list.length
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
				if (this.dataBases[i]._id === id) {
					this.dataBases.splice(i, 1);
					this.writeDataBasesInLocalDisk(this.dataBases);
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
		} catch (err: any) {
			if (err instanceof ResultTooLargeError) {
				return Promise.reject(err);
			}
			return Promise.reject(new InsightError(err.message));
		}
		return Promise.resolve(database);
	}
	private listIDs(): string[] {
		const res: string[] = [];
		this.dataBases.forEach(function (da) {
			res.push(da._id);
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
		fs.writeFileSync("./data/databases.json", JSON.stringify(dataBases));
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
