import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError,
	NotFoundError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {folderTest} from "@ubccpsc310/folder-test";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";

use(chaiAsPromised);

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;

	before(function () {
		// This block runs once and loads the datasets.
		sections = getContentFromArchives("pair.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		clearDisk();
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			clearDisk();
		});
		// This is a unit test. You should create more like this!
		it("add 1 dataset", async function () {
			// Setup
			await facade.addDataset("1course", sections, InsightDatasetKind.Sections);

			// Execution
			const result = await facade.listDatasets();

			// Validation
			expect(result).to.be.an.instanceof(Array);
			expect(result).to.have.length(1);
			expect(result).to.deep.equal([
				{
					id: "1course",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
			]);
		});
		it("adds 3 datasets", async function () {
			// Setup
			await facade.addDataset("first-courses", sections, InsightDatasetKind.Sections);
			await facade.addDataset("second-courses", sections, InsightDatasetKind.Sections);
			await facade.addDataset("third-courses", sections, InsightDatasetKind.Sections);

			// Execution
			const result = await facade.listDatasets();

			// Validation
			expect(result).to.be.an.instanceof(Array);
			expect(result).to.have.length(3);
			expect(result).to.have.deep.members([
				{
					id: "first-courses",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
				{
					id: "second-courses",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
				{
					id: "third-courses",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
			]);
		});
		it("error adding a dataset with repeated id", async function () {
			// Setup
			await facade.addDataset("1course", sections, InsightDatasetKind.Sections);

			// Execution
			const result = await facade.listDatasets();

			// Validation
			expect(result).to.be.an.instanceof(Array);
			expect(result).to.have.length(1);
			expect(result).to.deep.equal([
				{
					id: "1course",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
			]);

			expect(facade.addDataset("1course", sections, InsightDatasetKind.Sections)).eventually.to.be.rejectedWith(
				InsightError
			);
		});
		it("should reject with  an empty dataset id", function () {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("error adding a dataset id containing underscore", async function () {
			return expect(
				facade.addDataset("course_smth", sections, InsightDatasetKind.Sections)
			).eventually.to.be.rejectedWith(InsightError);
		});
		it("remove 1 dataset at a time from 2", async function () {
			// Setup
			await facade.addDataset("first-courses", sections, InsightDatasetKind.Sections);
			await facade.addDataset("second-courses", sections, InsightDatasetKind.Sections);

			// Execution
			const result = await facade.listDatasets();

			// Validation
			expect(result).to.be.an.instanceof(Array);
			expect(result).to.have.length(2);
			expect(result).to.have.deep.members([
				{
					id: "first-courses",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
				{
					id: "second-courses",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
			]);

			// Setup
			await facade.removeDataset("first-courses");

			// Execution
			const result1 = await facade.listDatasets();

			// Validation
			expect(result1).to.be.an.instanceof(Array);
			expect(result1).to.length(1);
			expect(result1).to.deep.equal([
				{
					id: "second-courses",
					kind: InsightDatasetKind.Sections,
					numRows: 64612,
				},
			]);
			// Setup
			await facade.removeDataset("second-courses");

			// Execution
			const result2 = await facade.listDatasets();

			expect(result2).to.be.an.instanceof(Array).that.is.empty;
			expect(result2).to.length(0);
		});
		it("error removing from empty facade", function () {
			const action = facade.removeDataset("1course");
			return expect(action).eventually.to.be.rejectedWith(NotFoundError);
		});

		it("error removing a dataset that has not been added", async function () {
			// Setup
			await facade.addDataset("1course", sections, InsightDatasetKind.Sections);
			// Error
			return expect(facade.removeDataset("2course")).eventually.to.be.rejectedWith(NotFoundError);
		});
		it("error removing a dataset with empty id", async function () {
			// Setup
			await facade.addDataset("1course", sections, InsightDatasetKind.Sections);

			// Error
			return expect(facade.removeDataset("")).eventually.to.be.rejectedWith(InsightError);
		});
		it("error removing a dataset with underscore", async function () {
			// Setup
			await facade.addDataset("1course", sections, InsightDatasetKind.Sections);
			// Error
			return expect(facade.removeDataset("courses_smth")).eventually.to.be.rejectedWith(InsightError);
		});
		it("should list 0 datasets", async function () {
			// Setup+Execution
			const result = await facade.listDatasets();
			// Validation
			expect(result).to.be.an.instanceof(Array).that.is.empty;
			expect(result).to.have.length(0);
			expect(result).to.deep.equal([]);
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			facade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [facade.addDataset("sections", sections, InsightDatasetKind.Sections)];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			clearDisk();
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests (general/errors)",
			(input) => facade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult: (actual, expected: any) => {
					expect(actual).to.have.have.deep.members(expected);
					expect(actual).to.have.length(expected.length);
				},
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.an.instanceOf(ResultTooLargeError);
					} else if (expected === "InsightError") {
						expect(actual).to.be.an.instanceOf(InsightError);
					} else {
						// It shouldn't come here anyway
						expect.fail("UNEXPECTED ERROR");
					}
				},
			}
		);

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests (ordered queries involved)",
			(input) => facade.performQuery(input),
			"./test/resources/orderedQueries",
			{
				assertOnResult: (actual, expected: any) => {
					expect(actual).to.have.deep.ordered.members(expected);
					expect(actual).to.deep.equal(expected);
				},
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.an.instanceOf(ResultTooLargeError);
					} else if (expected === "InsightError") {
						expect(actual).to.be.an.instanceOf(InsightError);
					} else {
						// It shouldn't come here anyway
						expect.fail("UNEXPECTED ERROR");
					}
				},
			}
		);
	});
});
