pragma solidity ^0.4.24;

contract FundingHub {
    address[] private projects;
    uint public countOfProjects;
    
    function createProject(uint _amountToBeRaised, uint8 _daysAfter) public {
        address project = new Project(_amountToBeRaised,_daysAfter,msg.sender);
        projects.push(project);
        countOfProjects++;
    }
    
    function getAllProjects() view public returns(address[]){
        return projects;
    }
}

contract Project {
    
    struct Details {
        address manager;
        uint amountToBeRaised;
        uint deadline;
        bool isOpen;
    }
    
    Details private details;
    uint public amountRaisedSoFar;
    mapping(address => uint) public contributions;
    
    constructor(uint _amountToBeRaised, uint _daysAfter, address _manager) public {
        details = Details({
            manager : _manager,
            amountToBeRaised : _amountToBeRaised,
            deadline : now + _daysAfter * 1 days,
            isOpen : true
        });
    }
    
    modifier contributionCanStillBeAccepted() {        
        require(details.isOpen && now < details.deadline);
        _;
    }
      
    modifier withdrawable() {        
        require(details.isOpen  && now > details.deadline);
        _;
    }
    
    function fund() contributionCanStillBeAccepted payable public {        
        acceptFund();

        if(amountRaisedSoFar >= details.amountToBeRaised){
            details.isOpen = false;
            payout();
        }
    }

    function acceptFund() private {
        uint prevContribution = contributions[msg.sender];
        contributions[msg.sender] = prevContribution + msg.value;
        amountRaisedSoFar += msg.value;
    }    

    function payout() private {        
        details.manager.transfer(amountRaisedSoFar);
        amountRaisedSoFar = 0;
    }
    
    function withdraw() withdrawable public {
        uint contribution = contributions[msg.sender];
        
        if(contribution > 0) {
            contributions[msg.sender] = 0;
            msg.sender.transfer(contribution);    
        }
    }
    
    function completeDetails() view public returns (
        address,uint,uint,bool,uint) {
        return (details.manager,details.amountToBeRaised, ((details.deadline - now)/ 1 days),details.isOpen,amountRaisedSoFar);
    }
}
