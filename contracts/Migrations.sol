// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

contract Migrations {
    address public owner;
    uint public lastCompletedMigration;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setCompleted(uint completed) public onlyOwner {
        lastCompletedMigration = completed;
    }
}
