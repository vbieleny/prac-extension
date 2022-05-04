export default interface TestResult {
    testName: string;
    algorithm: string;
    parameters: string;
    softPageFaults: string | number;
    hardPageFaults: string | number;
    accessedPagesCount: string | number;
    dirtyPagesCount: string | number;
    overhead: string | number;
}