import {InsightDatasetKind} from "../IInsightFacade";

export default class DataBase {

	public _id: string = "";
	public _list: any[] = [];
	public _kind: InsightDatasetKind;


	constructor(id: string, list: any[], kind: InsightDatasetKind) {
		this._id = id;
		this._list = list;
		this._kind = kind;
	}

	public getId(): string {
		return this._id;
	}

	public setId(value: string) {
		this._id = value;
	}

	public getList(): any[] {
		return this._list;
	}

	public setList(value: any[]) {
		this._list = value;
	}
}
