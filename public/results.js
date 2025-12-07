document.addEventListener("DOMContentLoaded", async () => {
    // Redirect to home if no data saved
    const formDataJSON = localStorage.getItem("formData");
    if (!formDataJSON) {
      window.location.href = "index.html";
      return;
    }
  
    // Parse saved data
    const formData = JSON.parse(formDataJSON);
  
    if (sessionStorage.getItem("analysisDone") === "true") {
      return;
    }
  
    const jobTitleEl = document.getElementById("jobTitle");
    const resumeFileEl = document.getElementById("resumeFile");
    const resumeSummaryEl = document.getElementById("resumeSummary");
    const jobListingEl = document.getElementById("jobListing");
    const optionsListEl = document.getElementById("optionsList");
    const reqMatchedEl = document.getElementById("reqMatched");
    const resumeScoreEl = document.getElementById("resumeScore");
    const comparisonTableBody = document.querySelector("#comparisonTable tbody");
    const suggestionsListEl = document.getElementById("suggestionsList");
    const backBtn = document.getElementById("backBtn");
    const downloadBtn = document.getElementById("downloadReportBtn");
    const dynamicSectionsContainer = document.getElementById("dynamicSections");
    const loadingOverlay = document.getElementById("loadingOverlay");
  
    const firstLine = formData.jobDescription.split('\n')[0]?.replace(/^Job Title:\s*/i, '').trim() || 'N/A';
    jobTitleEl.textContent = firstLine;
  
    resumeFileEl.textContent = formData.resumeFileName || "Unknown";
    jobListingEl.value = formData.jobDescription || "";
  
    optionsListEl.innerHTML = "";
    if (formData.options && formData.options.length) {
      formData.options.forEach(opt => {
        const li = document.createElement("li");
        li.textContent = opt;
        optionsListEl.appendChild(li);
      });
    } else {
      optionsListEl.textContent = "None";
    }
  
    try {
      const response = await fetch('http://localhost:3000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: formData.resumeText,
          jobText: formData.jobDescription,
          options: formData.options,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to fetch analysis: ${response.statusText}`);
      }
  
      const { results } = await response.json();
      resumeSummaryEl.value = results.summary || "No summary generated.";
  
      comparisonTableBody.innerHTML = "";
      suggestionsListEl.innerHTML = "";
      dynamicSectionsContainer.innerHTML = "";
  
      let matchPercent = 0;
  
      if (results.comparison) {
        let comparisonData = results.comparison;
        if (typeof comparisonData === 'string') {
          try {
            comparisonData = JSON.parse(comparisonData);
          } catch {
            comparisonData = {
              matches: [],
              missing: [],
              suggestions: ["Failed to parse AI response as JSON."],
            };
          }
        }
  
        if (comparisonData && typeof comparisonData === 'object') {
          const totalReqs = (comparisonData.matches.length || 0) + (comparisonData.missing.length || 0);
          const matchedReqs = comparisonData.matches.length || 0;
          matchPercent = totalReqs === 0 ? 0 : Math.round((matchedReqs / totalReqs) * 100);
          reqMatchedEl.textContent = `${matchPercent}%`;
  
          if (Array.isArray(comparisonData.matches) && Array.isArray(comparisonData.missing)) {
            const allRequirements = [...comparisonData.matches, ...comparisonData.missing];
            allRequirements.forEach(req => {
              const tr = document.createElement("tr");
              const jobReqTd = document.createElement("td");
              jobReqTd.textContent = req;
  
              const yourResumeTd = document.createElement("td");
              if (comparisonData.matches.includes(req)) {
                yourResumeTd.textContent = "✔️ Matched";
                yourResumeTd.style.color = "green";
              } else {
                yourResumeTd.textContent = "❌ Missing";
                yourResumeTd.style.color = "red";
              }
  
              const statusTd = document.createElement("td");
              statusTd.textContent = yourResumeTd.textContent;
  
              tr.appendChild(jobReqTd);
              tr.appendChild(yourResumeTd);
              tr.appendChild(statusTd);
  
              comparisonTableBody.appendChild(tr);
            });
          }
  
          if (Array.isArray(comparisonData.suggestions)) {
            comparisonData.suggestions.forEach(suggestion => {
              const li = document.createElement("li");
              li.textContent = suggestion;
              suggestionsListEl.appendChild(li);
            });
          }
        } else {
          const li = document.createElement("li");
          li.textContent = comparisonData;
          suggestionsListEl.appendChild(li);
          reqMatchedEl.textContent = "0%";
        }
      } else {
        reqMatchedEl.textContent = "0%";
      }
  
      if (results.resumeScore) {
        let scoreNum = parseInt(results.resumeScore, 10);
        if (isNaN(scoreNum)) scoreNum = 0;
        scoreNum = Math.min(Math.max(scoreNum, 1), 100);
        resumeScoreEl.textContent = `${scoreNum}/100`;
      } else {
        resumeScoreEl.textContent = "No score available";
      }
  
      if (results.tailoredResume) {
        const div = document.createElement("div");
        div.classList.add("option-section");
        div.innerHTML = `
          <h3>Tailored Resume</h3>
          <pre>${results.tailoredResume}</pre>
        `;
        dynamicSectionsContainer.appendChild(div);
      }
  
      if (results.coverLetter) {
        const div = document.createElement("div");
        div.classList.add("option-section");
        div.innerHTML = `
          <h3>Cover Letter</h3>
          <pre>${results.coverLetter}</pre>
        `;
        dynamicSectionsContainer.appendChild(div);
      }
  
      // Prevent re-analysis on refresh or return
      sessionStorage.setItem("analysisDone", "true");
  
    } catch (error) {
      alert(error.message);
      console.error(error);
      reqMatchedEl.textContent = "0%";
    } finally {
        loadingOverlay.classList.add("hide");
        setTimeout(() => {
          loadingOverlay.style.display = "none";
        }, 500);        
    }
  
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  
    downloadBtn.addEventListener("click", () => {
      const report = `
  Job Title: ${jobTitleEl.textContent}
  Job Listing:
  ${jobListingEl.value}
  
  Resume Summary:
  ${resumeSummaryEl.value}
  
  Selected Options:
  ${formData.options.join(", ")}
  
  Requirements Matched: ${reqMatchedEl.textContent}
  Resume Quality Score: ${resumeScoreEl.textContent}
  
  Dynamic Results:
  ${dynamicSectionsContainer.innerText}
      `;
      const blob = new Blob([report], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "job_analysis_report.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });
  