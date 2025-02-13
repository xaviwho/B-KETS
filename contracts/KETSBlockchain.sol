// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

contract KETSBlockchain {
    address public regulator;  // Ministry of Environment / K-ETS authority

    uint public auctionPrice = 29 ether; // Auction price in ETH (KRW 10,672)
    uint public creditPrice = 0.0027 ether;  // Price per carbon credit (KRW 9,999)

    constructor() {
        regulator = msg.sender; // Set the contract deployer as the regulator
    }

    // 🔹 Events for logging
    event IndustryRegistered(address indexed industry, string name);
    event VerifierRegistered(address indexed verifier, string name);
    event OffsetProjectRegistered(address indexed owner, string projectName);
    event CreditsIssued(address indexed industry, uint amount, string method);
    event CreditTraded(address indexed from, address indexed to, uint amount);
    event CreditAuctioned(address indexed bidder, uint amount);
    
    // 🔹 Modifier to restrict actions to the regulator
    modifier onlyRegulator() {
        require(msg.sender == regulator, "Not authorized");
        _;
    }

    struct Industry {
        string name;
        address industryAddress;
        uint emissions;
        uint creditsOwned;
        string creditType; // free allowances / auctioning / trading / offsetProject
        bool isRegistered;
        bool isEITE;
    }

    struct OffsetProject {
        string projectName;
        address owner;
        uint creditsEarned;
        uint incentive;
        bool isApproved;
    }

    struct Auction {
        uint creditsAvailable;
        uint minBidPrice;
        bool isActive;
        mapping(address => uint) bids;
    }

    struct Verifier {
        string verifierName;
        address verifierAddress;
        bool isApproved;
    }

    struct Stakeholder {
        string name;
        address stakeholderAddress;
    }    

    struct GHG {
        uint CO2; 
        uint CH4;
        uint N2O;
        uint HFCs;
        uint PFCs; 
        uint SF6;
    }

    // 🔹 Modified industry mapping to store multiple registrations per account
    mapping(address => Industry[]) public industries;
    mapping(address => OffsetProject) public offsetProjects;
    mapping(address => Verifier) public verifiers;
    mapping(address => Stakeholder) public stakeholders;
    mapping(address => GHG) public ghgEmissions;
    Auction public currentAuction;

    // 🔹 Register multiple industries under the same account
    function registerIndustry(string memory _name, bool _isEITE) public {
        industries[msg.sender].push(Industry(_name, msg.sender, 0, 0, "", true, _isEITE));
        emit IndustryRegistered(msg.sender, _name);
    }

    // 🔹 Get all industries registered by an account (Fixed)
    function getIndustriesByOwner(address _owner) 
        public 
        view 
        returns (
            string[] memory names, 
            bool[] memory isRegistered, 
            bool[] memory isEITE
        ) 
    {
        uint industryCount = industries[_owner].length;
        names = new string[](industryCount);
        isRegistered = new bool[](industryCount);
        isEITE = new bool[](industryCount);

        for (uint i = 0; i < industryCount; i++) {
            Industry storage industry = industries[_owner][i];
            names[i] = industry.name;
            isRegistered[i] = industry.isRegistered;
            isEITE[i] = industry.isEITE;
        }
    }

    // 🔹 Register an offset project
    function registerOffsetProject(string memory _projectName) public {
        offsetProjects[msg.sender] = OffsetProject(_projectName, msg.sender, 0, 0, false);
        emit OffsetProjectRegistered(msg.sender, _projectName);
    }

    // 🔹 Register a verifier
    function registerVerifier(string memory _verifierName) public onlyRegulator {
        verifiers[msg.sender] = Verifier(_verifierName, msg.sender, true);
        emit VerifierRegistered(msg.sender, _verifierName);
    }

    // 🔹 Update GHG emissions for an industry
    function updateGHGEmissions(address _industry, uint industryIndex, uint _CO2, uint _CH4, uint _N2O, uint _HFCs, uint _PFCs, uint _SF6) external {
        require(industryIndex < industries[_industry].length, "Invalid industry index");
        ghgEmissions[_industry] = GHG(_CO2, _CH4, _N2O, _HFCs, _PFCs, _SF6);
    }

    // 🔹 Issue free allocation of credits
    function freeAllocation(address _industryAddress, uint industryIndex, uint _credits) external onlyRegulator {
        require(industryIndex < industries[_industryAddress].length, "Invalid industry index");
        uint allocatedCredits = industries[_industryAddress][industryIndex].isEITE ? _credits : (_credits * 90) / 100;
        industries[_industryAddress][industryIndex].creditsOwned += allocatedCredits;
        emit CreditsIssued(_industryAddress, allocatedCredits, "Free Allocation");
    }

    // 🔹 Trade carbon credits
    function tradeCredits(address _to, uint industryIndexFrom, uint industryIndexTo, uint _amount) external {
        require(industryIndexFrom < industries[msg.sender].length, "Invalid sender industry index");
        require(industryIndexTo < industries[_to].length, "Invalid receiver industry index");
        require(industries[msg.sender][industryIndexFrom].creditsOwned >= _amount, "Insufficient credits");

        industries[msg.sender][industryIndexFrom].creditsOwned -= _amount;
        industries[_to][industryIndexTo].creditsOwned += _amount;
        emit CreditTraded(msg.sender, _to, _amount);
    }

    // 🔹 Borrow credits (compliance borrowing)
    function borrowCredits(address _to, uint industryIndexFrom, uint industryIndexTo, uint _amount) external {
        require(industryIndexFrom < industries[msg.sender].length, "Invalid sender industry index");
        require(industryIndexTo < industries[_to].length, "Invalid receiver industry index");
        require(_amount > 0 && industries[msg.sender][industryIndexFrom].creditsOwned >= _amount, "Invalid borrow amount");

        industries[_to][industryIndexTo].creditsOwned += _amount;
        industries[msg.sender][industryIndexFrom].creditsOwned -= _amount;
    }

    // 🔹 View borrowed credits
    function viewBorrowedCredits(address _industry, uint industryIndex) external view returns (uint) {
        require(industryIndex < industries[_industry].length, "Invalid industry index");
        return industries[_industry][industryIndex].creditsOwned;
    }
}
