import Section from "./Section";

export default class DataBase {
	_id: string = "";
	_list: Section[] = [];

	constructor(id: string, list: Section[]) {
		this._id = id;
		this._list = list;
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
