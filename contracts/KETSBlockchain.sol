// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

contract KETSBlockchain {
    address public regulator;  // Ministry of Environment / K-ETS authority

    // Auction and credit pricing parameters (these can be used as needed)
    uint public auctionPrice = 29 ether;      // Auction price in ETH (example value)
    uint public creditPrice = 0.0027 ether;     // Price per carbon credit (example value)

    constructor() {
        regulator = msg.sender; // The deployer becomes the regulator
    }

    // ====================
    // EVENTS
    // ====================
    event IndustryRegistered(address indexed industry, string name);
    event OffsetProjectRegistered(address indexed owner, string projectName);
    event CreditsIssued(address indexed industry, uint amount, string method);
    event CreditTraded(address indexed from, address indexed to, uint amount);
    event CreditAuctioned(address indexed bidder, uint bidCredits);
    event AuctionFinalized(uint totalAllocated);

    // ====================
    // MODIFIERS
    // ====================
    modifier onlyRegulator() {
        require(msg.sender == regulator, "Not authorized");
        _;
    }

    // ====================
    // STRUCTS
    // ====================

    // Detailed greenhouse gas emissions data
    struct GHG {
        uint CO2; 
        uint CH4;
        uint N2O;
        uint HFCs;
        uint PFCs; 
        uint SF6;
    }

    // Industry registration details with embedded GHG data
    struct Industry {
        string name;
        address industryAddress;
        uint creditsOwned;
        string creditType;   // e.g., "free allocation", "auctioning", etc.
        bool isRegistered;
        bool isEITE;
        GHG ghgData;         // Each industry maintains its own emissions record
    }

    // Offset project details
    struct OffsetProject {
        string projectName;
        address owner;
        uint creditsEarned;
        uint incentive;
        bool isApproved;
    }

    // Verifier details
    struct Verifier {
        string verifierName;
        address verifierAddress;
        bool isApproved;
    }

    // Stakeholder details
    struct Stakeholder {
        string name;
        address stakeholderAddress;
    }    

    // ====================
    // STORAGE
    // ====================

    // Allow multiple industry registrations per address
    mapping(address => Industry[]) public industries;
    mapping(address => OffsetProject) public offsetProjects;
    mapping(address => Verifier) public verifiers;
    mapping(address => Stakeholder) public stakeholders;

    // ====================
    // CARBON CREDIT ISSUANCE: FREE ALLOCATION
    // ====================
    // The regulator can issue free credits. EITE industries get 100% allocation; others get 90%.
    function freeAllocation(
        address _industryOwner,
        uint industryIndex,
        uint _credits
    ) external onlyRegulator {
        require(industryIndex < industries[_industryOwner].length, "Invalid industry index");
        Industry storage ind = industries[_industryOwner][industryIndex];
        uint allocatedCredits = ind.isEITE ? _credits : (_credits * 90) / 100;
        ind.creditsOwned += allocatedCredits;
        emit CreditsIssued(_industryOwner, allocatedCredits, "Free Allocation");
    }

    // ====================
    // INDUSTRY REGISTRATION
    // ====================
    // Register an industry. Multiple registrations per account are allowed.
    function registerIndustry(string memory _name, bool _isEITE) public {
        industries[msg.sender].push(
            Industry({
                name: _name,
                industryAddress: msg.sender,
                creditsOwned: 0,
                creditType: "",
                isRegistered: true,
                isEITE: _isEITE,
                ghgData: GHG(0, 0, 0, 0, 0, 0)
            })
        );
        emit IndustryRegistered(msg.sender, _name);
    }

    // Retrieve industry registration details for an account (for front-end use)
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
            Industry storage ind = industries[_owner][i];
            names[i] = ind.name;
            isRegistered[i] = ind.isRegistered;
            isEITE[i] = ind.isEITE;
        }
    }

    // ====================
    // OFFSET PROJECTS & VERIFIERS
    // ====================
    function registerOffsetProject(string memory _projectName) public {
        offsetProjects[msg.sender] = OffsetProject(_projectName, msg.sender, 0, 0, false);
        emit OffsetProjectRegistered(msg.sender, _projectName);
    }

    function registerVerifier(string memory _verifierName) public onlyRegulator {
        verifiers[msg.sender] = Verifier(_verifierName, msg.sender, true);
    }

    // ====================
    // GHG EMISSIONS UPDATE
    // ====================
    // Update GHG data for a specific industry registration
    function updateGHGEmissions(
        address _industryOwner,
        uint industryIndex,
        uint _CO2,
        uint _CH4,
        uint _N2O,
        uint _HFCs,
        uint _PFCs,
        uint _SF6
    ) external {
        require(industryIndex < industries[_industryOwner].length, "Invalid industry index");
        industries[_industryOwner][industryIndex].ghgData = GHG(_CO2, _CH4, _N2O, _HFCs, _PFCs, _SF6);
    }

    // ====================
    // CARBON CREDIT TRADING & BORROWING
    // ====================
    function tradeCredits(
        address _to,
        uint industryIndexFrom,
        uint industryIndexTo,
        uint _amount
    ) external {
        require(industryIndexFrom < industries[msg.sender].length, "Invalid sender index");
        require(industryIndexTo < industries[_to].length, "Invalid receiver index");

        Industry storage senderInd = industries[msg.sender][industryIndexFrom];
        Industry storage receiverInd = industries[_to][industryIndexTo];

        require(senderInd.creditsOwned >= _amount, "Insufficient credits");

        senderInd.creditsOwned -= _amount;
        receiverInd.creditsOwned += _amount;

        emit CreditTraded(msg.sender, _to, _amount);
    }

    function borrowCredits(
        address _to,
        uint industryIndexFrom,
        uint industryIndexTo,
        uint _amount
    ) external {
        require(industryIndexFrom < industries[msg.sender].length, "Invalid sender index");
        require(industryIndexTo < industries[_to].length, "Invalid receiver index");

        Industry storage senderInd = industries[msg.sender][industryIndexFrom];
        Industry storage receiverInd = industries[_to][industryIndexTo];

        require(_amount > 0 && senderInd.creditsOwned >= _amount, "Invalid borrow amount");

        receiverInd.creditsOwned += _amount;
        senderInd.creditsOwned -= _amount;
    }

    // ====================
    // AUCTION-BASED CARBON CREDIT ISSUANCE
    // ====================

    // Structure to hold bid details.
    struct Bid {
        uint bidCredits; // Number of credits the bidder wants to purchase
    }

    // Auction structure with bid storage and bidder list for iteration
    struct Auction {
        uint creditsAvailable;    // Total credits available for auction
        uint minBidPrice;         // Minimum price per credit in wei
        bool isActive;            // Auction active flag
        mapping(address => Bid) bids; // Bids placed by bidders
        address[] bidders;        // List of bidder addresses (for finalization)
    }

    Auction public currentAuction;

    // Create an auction for new credit issuance. Only the regulator can do this.
    function createAuction(uint _creditsAvailable, uint _minBidPrice) external onlyRegulator {
        require(!currentAuction.isActive, "Auction already active");
        require(_creditsAvailable > 0, "Credits must be > 0");

        currentAuction.creditsAvailable = _creditsAvailable;
        currentAuction.minBidPrice = _minBidPrice;
        currentAuction.isActive = true;
        // Clear previous bidders (if any)
        delete currentAuction.bidders;
    }

    // Place a bid in the auction.
    // Bidders send ETH equal to bidCredits * minBidPrice.
    // Restricts bid size to 15% of total credits available.
    function placeBid(uint bidCredits) external payable {
        require(currentAuction.isActive, "No active auction");
        require(bidCredits > 0, "Bid must be > 0");
        require(bidCredits <= (currentAuction.creditsAvailable * 15) / 100, "Bid exceeds limit");
        require(msg.value == bidCredits * currentAuction.minBidPrice, "Incorrect ETH amount");
        // Ensure a bidder can only bid once per auction.
        require(currentAuction.bids[msg.sender].bidCredits == 0, "Bid already placed");

        currentAuction.bids[msg.sender] = Bid(bidCredits);
        currentAuction.bidders.push(msg.sender);
        emit CreditAuctioned(msg.sender, bidCredits);
    }

    // Finalize the auction.
    // Iterates through bids in order of placement and allocates credits to each bidder until credits run out.
    // Any excess ETH is refunded to the bidder.
    // Auction proceeds (ETH) are then transferred to the regulator.
    function finalizeAuction() external onlyRegulator {
        require(currentAuction.isActive, "No active auction");
        uint remaining = currentAuction.creditsAvailable;

        for (uint i = 0; i < currentAuction.bidders.length; i++) {
            address bidder = currentAuction.bidders[i];
            Bid storage bid = currentAuction.bids[bidder];
            if (bid.bidCredits <= remaining) {
                // Full allocation: allocate all bid credits
                require(industries[bidder].length > 0, "Bidder has no registered industry");
                industries[bidder][0].creditsOwned += bid.bidCredits;
                remaining -= bid.bidCredits;
            } else {
                // Partial allocation: allocate only remaining credits, refund excess ETH
                require(industries[bidder].length > 0, "Bidder has no registered industry");
                industries[bidder][0].creditsOwned += remaining;
                uint allocated = remaining;
                uint refund = (bid.bidCredits - allocated) * currentAuction.minBidPrice;
                payable(bidder).transfer(refund);
                remaining = 0;
                break; // Auction fully allocated
            }
        }
        currentAuction.isActive = false;
        emit AuctionFinalized(currentAuction.creditsAvailable - remaining);
        // Transfer accumulated ETH to the regulator.
        payable(regulator).transfer(address(this).balance);
    }
}
