export default interface TestResult {
    testName: string;
    algorithm: string;
    parameters: string;
    pageFaultWithoutVictim: string | number;
    pageFaultWithVictim: string | number;
    accessedPagesCount: string | number;
    dirtyPagesCount: string | number;
    overhead: string | number;
}