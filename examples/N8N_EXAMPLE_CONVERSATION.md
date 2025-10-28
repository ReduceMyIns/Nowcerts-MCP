# Example Conversation: Improved Auto Quote Flow

## Scenario: New Customer Wants Auto Insurance Quote

### ❌ OLD WAY (Mechanical, Overwhelming)

**Customer**: I need to get a quote for car insurance

**Agent**: I can help you get a car insurance quote. To start, I'll check if you already exist in our system to avoid duplicates, then we'll create a quote.

Please provide (or at least one of these, so I can search by phone or email):

First name
Last name
Phone number (format: 555-123-4567)
Email address
Street address (addressLine1)
City
State
ZIP code

Optional but helpful:
Date of birth

Vehicle and policy details (you can skip optional items if you'd like me to fill them in later):

Vehicle year, make, model (and VIN if available)
Type of use (Pleasure, Commute, Business, etc.)
Estimated annual miles (optional)
Desired policy effective date (YYYY-MM-DD) and expiration date
Carrier name (if you have a preferred carrier) or leave blank to pick later
Quote number (if you want to assign one, otherwise I can generate)

**Problems:**
- Announces internal process ("check if you exist")
- Giant overwhelming list of fields
- Uses technical terms ("addressLine1")
- Asks for specific phone format (customers ignore this)
- Asks for vehicle details before using Fenris (defeats the purpose!)
- Not conversational or natural

---

### ✅ NEW WAY (Conversational, Efficient)

**Customer**: I need to get a quote for car insurance

**Agent**: I'd be happy to help you with that! Let me get some basic information so I can prepare your quote.

What's your name?

**Customer**: John Smith

**Agent**: Great! And what's the best phone number to reach you?

**Customer**: 555 123 4567

*[Agent silently normalizes to 555-123-4567]*
*[Agent silently searches existing customers by phone - none found]*

**Agent**: Perfect. What's your email address?

**Customer**: john.smith@email.com

*[Agent silently searches by email - none found]*

**Agent**: Thanks! What's your current address?

**Customer**: 123 Main Street, Austin, TX 78701

*[Agent silently calls smarty_verifyAddress - address valid]*
*[Agent silently calls fenris_prefillHousehold]*

**Agent**: And finally, what's your date of birth?

**Customer**: 03/15/1985

*[Agent creates prospect record in NowCerts]*

**Agent**: Perfect! I see you have a 2020 Honda Accord and a 2018 Toyota RAV4 registered at this address. Let me ask you a few quick questions about each vehicle.

Starting with the Honda Accord - who's the primary driver?

**Customer**: That's mine

**Agent**: How do you mainly use it - commuting to work, or just for running errands?

**Customer**: Commuting to work mostly

**Agent**: About how many miles per year?

**Customer**: Probably 12,000

**Agent**: And do you own it outright, or is there still a loan on it?

**Customer**: Still paying it off

**Agent**: Got it. Since there's a loan on this vehicle, I'll include comprehensive and collision coverage which your lender requires. Now for the Toyota RAV4 - who drives that one?

**Customer**: My wife

**Agent**: What's her name?

**Customer**: Sarah Smith

**Agent**: And how does she use the RAV4?

**Customer**: Mostly around town, taking the kids to school

**Agent**: Any loan on that one?

**Customer**: No, we own it

**Agent**: Perfect. Would you like comprehensive and collision coverage on the RAV4 as well? Since it's a 2018, I'd recommend it to protect your investment.

**Customer**: Yes, let's do that

**Agent**: Sounds good. For liability coverage, I recommend at least 100/300/100 for good protection, though Texas minimum is also available at a lower cost. Which would you prefer?

**Customer**: What's the difference in price?

**Agent**: Let me run both options for you...

*[Agent creates quote with recommended coverage]*
*[Agent creates quote with minimum coverage]*

With 100/300/100 liability, your premium would be $185/month. With state minimum, it would be $145/month.

**Customer**: Let's go with the higher coverage

**Agent**: Smart choice! Your total premium is $185/month for both vehicles with full coverage. I'll email you the complete quote details and an application to get started. Would you like to move forward with this?

**Customer**: Yes

**Agent**: Excellent! You should receive the email in just a moment. When would be a good time for me to call you back to review the application and finalize everything?

**Customer**: How about tomorrow afternoon?

**Agent**: Perfect! I'll call you tomorrow at 2pm. Is 555-123-4567 still the best number?

**Customer**: Yes

*[Agent schedules callback in Google Calendar]*
*[Agent sends quote via Gmail with PDF attachment]*
*[Agent logs interaction in HubSpot]*

**Agent**: All set! I've scheduled a call for tomorrow at 2pm and sent your quote to john.smith@email.com. Looking forward to talking with you tomorrow!

---

## Key Improvements Demonstrated

### 1. Conversational Flow
- Natural back-and-forth instead of giant form dump
- One or two questions at a time
- Friendly, warm tone

### 2. Silent Duplicate Check
- Searched by phone and email automatically
- Didn't announce "checking for duplicates"
- Would only mention if found: "I found an existing profile. Is this you?"

### 3. Phone Number Normalization
- Customer typed: "555 123 4567"
- Agent converted to: "555-123-4567" silently
- No request for specific format

### 4. Automatic Fenris Prefill
- Called after getting address
- Discovered both vehicles automatically
- Customer didn't have to list them!

### 5. Vehicle-by-Vehicle Discussion
- Discussed Honda first, then Toyota
- Not overwhelming
- Natural conversation

### 6. Smart Coverage Recommendations
- Honda (with loan) → Required comp/coll, explained why
- Toyota (no loan) → Recommended comp/coll, gave choice
- Liability → Presented options with price difference

### 7. No Technical Jargon
- Didn't say "addressLine1"
- Didn't mention tool names
- Didn't announce internal processes

### 8. Proper Follow-Up
- Scheduled callback
- Sent email with quote
- Logged in CRM
- All done silently

---

## Scenario 2: Existing Customer Adding Vehicle

**Customer**: Hi, I need to add a vehicle to my policy

**Agent**: I'd be happy to help! What's your phone number or email so I can pull up your account?

**Customer**: 555-123-4567

*[Agent searches and finds existing customer]*

**Agent**: Perfect! Hi John, I have your account pulled up. What vehicle are you adding?

**Customer**: Just bought a 2024 Tesla Model 3

**Agent**: Congratulations! Do you happen to have the VIN handy?

**Customer**: Yes, it's 5YJ3E1EA5PF123456

*[Agent calls nhtsa_decodeVin]*
*[Agent calls nhtsa_checkRecalls - no recalls]*

**Agent**: Great, I've got all the details on the 2024 Tesla Model 3 Long Range. A few quick questions:

How will you mainly use it?

**Customer**: Commuting

**Agent**: About how many miles per year?

**Customer**: About 15,000

**Agent**: And is there a loan or lease on it?

**Customer**: Lease

**Agent**: Perfect. Since it's leased, I'll include comprehensive and collision coverage which your leasing company requires. I'll add this to your existing policy and send you the updated quote. One moment...

*[Agent updates policy in NowCerts]*

**Agent**: All set! Adding the Tesla will increase your premium by $95/month. Your new total will be $280/month for all three vehicles. I'm emailing you the updated policy documents now.

---

## Scenario 3: Customer with Complex Phone Number Format

**Customer**: I need a quote

**Agent**: I'd be happy to help! What's your name?

**Customer**: Maria Garcia

**Agent**: Great! And what's the best phone number to reach you?

**Customer**: +1 (555) 123.4567

*[Agent silently normalizes to: 555-123-4567]*
*[Agent searches - none found]*

**Agent**: Perfect. What's your email?

---

## Scenario 4: Potential Duplicate Found

**Customer**: I need a quote

**Agent**: I'd be happy to help! What's your name?

**Customer**: Mike Johnson

**Agent**: And what's your phone number?

**Customer**: 555-987-6543

*[Agent searches and finds existing record]*

**Agent**: I found an existing profile under this number for Mike Johnson at 456 Oak Street, Dallas. Is that you?

**Customer**: Oh yes, I forgot I already had an account

**Agent**: No problem! I have your information pulled up. What can I help you with today?

---

## Scenario 5: Fenris Returns No Data

**Customer**: I need a car insurance quote

**Agent**: I'd be happy to help! Let me get some basic information.

What's your name?

**Customer**: Tom Wilson

**Agent**: What's your phone number?

**Customer**: 555-222-3333

**Agent**: Email address?

**Customer**: tom@email.com

**Agent**: Current address?

**Customer**: 789 New Construction Lane, Austin, TX 78704

*[Agent calls fenris_prefillHousehold - returns no vehicles/residents]*

**Agent**: And your date of birth?

**Customer**: 05/20/1990

**Agent**: Perfect! Now let's talk about the vehicle you'd like to insure. What year, make and model is it?

**Customer**: 2023 Ford F-150

*[Agent continues with manual vehicle entry since Fenris didn't have data]*

---

## Summary: What Makes These Better

✅ **Natural conversation** - Not a form filling exercise
✅ **No technical terms** - Customer-friendly language
✅ **Smart automation** - Fenris, VIN decoder, duplicate check all silent
✅ **Guided recommendations** - Based on loan status, vehicle value, etc.
✅ **One thing at a time** - Not overwhelming
✅ **Proper follow-up** - Email, calendar, CRM integration
✅ **Error handling** - Graceful fallbacks when APIs fail
✅ **Accepts any format** - Phone numbers, addresses normalized automatically

